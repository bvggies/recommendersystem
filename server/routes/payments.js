const express = require('express');
const crypto = require('crypto');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const {
  isPaystackConfigured,
  getPublicKey,
  generateReference,
  normalizePaystackEmail,
  initializeTransaction,
  chargeMobileMoney,
  verifyTransaction
} = require('../utils/paystack');
const { ensureBoardingToken } = require('../utils/bookingTickets');

const router = express.Router();

const PAYMENT_METHODS = {
  paystack: { label: 'Paystack (Card & Mobile Money)', type: 'redirect', channels: ['card', 'mobile_money', 'bank'] },
  paystack_card: { label: 'Card (Paystack)', type: 'redirect', channels: ['card'] },
  mtn_momo: { label: 'MTN Mobile Money', type: 'mobile_money', provider: 'mtn' },
  vodafone_cash: { label: 'Vodafone Cash', type: 'mobile_money', provider: 'vod' },
  airteltigo_money: { label: 'AirtelTigo Money', type: 'mobile_money', provider: 'tgo' }
};

function getCallbackUrl() {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const callback = `${frontendUrl.replace(/\/$/, '')}/payment/callback`;

  if (process.env.NODE_ENV === 'production' && !callback.startsWith('https://')) {
    throw new Error('FRONTEND_URL must be set to your HTTPS site URL in production');
  }

  return callback;
}

async function finalizeSuccessfulPayment(client, booking, verification) {
  await client.query(
    `UPDATE bookings
     SET payment_status = 'paid',
         booking_status = 'confirmed',
         payment_reference = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [verification.data.reference, booking.id]
  );

  const tripResult = await client.query(
    'SELECT driver_id FROM trips WHERE id = $1',
    [booking.trip_id]
  );

  if (tripResult.rows[0]?.driver_id) {
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, title, message)
       VALUES ($1, 'payment', 'Booking Paid', $2)`,
      [
        tripResult.rows[0].driver_id,
        `Payment received for ${booking.seats_booked} seat(s) on trip #${booking.trip_id}`
      ]
    );
  }

  await client.query(
    `INSERT INTO notifications (user_id, notification_type, title, message)
     VALUES ($1, 'payment', 'Payment Successful', $2)`,
    [
      booking.passenger_id,
      `Your booking #${booking.id} is confirmed. Reference: ${verification.data.reference}`
    ]
  );

  await ensureBoardingToken(client, booking.id);
}

async function releasePendingBooking(client, booking) {
  await client.query(
    `UPDATE bookings
     SET booking_status = 'cancelled',
         payment_status = 'pending',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [booking.id]
  );

  await client.query(
    'UPDATE trips SET available_seats = available_seats + $1 WHERE id = $2',
    [booking.seats_booked, booking.trip_id]
  );
}

router.get('/config', authenticateToken, (req, res) => {
  res.json({
    enabled: isPaystackConfigured() || process.env.NODE_ENV !== 'production',
    public_key: getPublicKey(),
    mock_mode: !isPaystackConfigured(),
    callback_url: getCallbackUrl(),
    methods: Object.entries(PAYMENT_METHODS).map(([id, method]) => ({
      id,
      label: method.label,
      type: method.type
    }))
  });
});

router.post('/initialize', authenticateToken, async (req, res) => {
  const {
    trip_id,
    seats_booked = 1,
    payment_method = 'paystack',
    phone
  } = req.body;

  const seats = parseInt(seats_booked, 10);

  if (!trip_id) {
    return res.status(400).json({ error: 'Trip ID is required' });
  }

  if (!Number.isInteger(seats) || seats < 1) {
    return res.status(400).json({ error: 'seats_booked must be a positive integer' });
  }

  const method = PAYMENT_METHODS[payment_method];
  if (!method) {
    return res.status(400).json({ error: 'Unsupported payment method' });
  }

  if (method.type === 'mobile_money' && !phone) {
    return res.status(400).json({ error: 'Phone number is required for mobile money payments' });
  }

  let callbackUrl;

  try {
    callbackUrl = getCallbackUrl();
  } catch (callbackError) {
    return res.status(500).json({ error: callbackError.message });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query(
      `SELECT id, driver_id, fare, available_seats, origin, destination
       FROM trips
       WHERE id = $1 AND status = 'scheduled'
       FOR UPDATE`,
      [trip_id]
    );

    if (tripResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found or not available' });
    }

    const trip = tripResult.rows[0];

    if (trip.driver_id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot book your own trip' });
    }

    if (trip.available_seats < seats) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    const existingBooking = await client.query(
      `SELECT id FROM bookings
       WHERE passenger_id = $1 AND trip_id = $2 AND booking_status IN ('pending', 'confirmed')`,
      [req.user.id, trip_id]
    );

    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You already have an active booking for this trip' });
    }

    const seatUpdate = await client.query(
      `UPDATE trips
       SET available_seats = available_seats - $1
       WHERE id = $2 AND available_seats >= $1
       RETURNING available_seats`,
      [seats, trip_id]
    );

    if (seatUpdate.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Not enough seats available' });
    }

    const reference = generateReference('TRP');
    const amount = Number(trip.fare) * seats;

    const userResult = await client.query(
      'SELECT email, username FROM users WHERE id = $1',
      [req.user.id]
    );
    const passengerEmail = normalizePaystackEmail(
      userResult.rows[0]?.email,
      req.user.id,
      userResult.rows[0]?.username || req.user.username
    );

    const bookingResult = await client.query(
      `INSERT INTO bookings (
         passenger_id, trip_id, seats_booked, booking_status,
         payment_status, payment_method, payment_reference
       )
       VALUES ($1, $2, $3, 'pending', 'pending', $4, $5)
       RETURNING *`,
      [req.user.id, trip_id, seats, payment_method, reference]
    );

    const booking = bookingResult.rows[0];
    const metadata = {
      booking_id: String(booking.id),
      trip_id: String(trip_id),
      passenger_id: String(req.user.id),
      route: `${trip.origin} → ${trip.destination}`
    };

    let paymentResponse;

    if (method.type === 'mobile_money') {
      paymentResponse = await chargeMobileMoney({
        email: passengerEmail,
        amount,
        reference,
        phone,
        provider: method.provider,
        metadata
      });
    } else {
      paymentResponse = await initializeTransaction({
        email: passengerEmail,
        amount,
        reference,
        callbackUrl,
        channels: method.channels,
        metadata
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: method.type === 'mobile_money'
        ? 'Mobile money payment initiated. Approve the prompt on your phone.'
        : 'Redirect to Paystack to complete payment.',
      booking,
      payment: {
        reference,
        amount,
        currency: 'GHS',
        method: payment_method,
        authorization_url: paymentResponse.data.authorization_url || null,
        access_code: paymentResponse.data.access_code || null,
        display_text: paymentResponse.data.display_text || null,
        mock_mode: !isPaystackConfigured()
      }
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Payment rollback error:', rollbackError);
    }

    console.error('Payment initialize error:', error);

    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : /minimum payment|valid ghana|not configured|frontend_url/i.test(error.message)
      ? 400
      : 502;

    res.status(statusCode).json({
      error: error.message || 'Failed to initialize payment'
    });
  } finally {
    client.release();
  }
});

router.get('/verify/:reference', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const verification = await verifyTransaction(req.params.reference);

    const bookingResult = await client.query(
      `SELECT b.*, t.origin, t.destination, t.departure_time
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       WHERE b.payment_reference = $1 AND b.passenger_id = $2`,
      [req.params.reference, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found for this payment reference' });
    }

    const booking = bookingResult.rows[0];

    if (verification.data.status === 'success') {
      await client.query('BEGIN');
      await finalizeSuccessfulPayment(client, booking, verification);
      await client.query('COMMIT');

      const updated = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
      return res.json({
        message: 'Payment verified successfully',
        booking: updated.rows[0],
        payment: verification.data
      });
    }

    if (booking.booking_status === 'pending') {
      await client.query('BEGIN');
      await releasePendingBooking(client, booking);
      await client.query('COMMIT');
    }

    res.status(402).json({
      error: 'Payment was not successful',
      status: verification.data.status,
      booking
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment verify error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  } finally {
    client.release();
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (secret) {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const data = req.body.data;

    if (event !== 'charge.success' || !data?.reference) {
      return res.json({ received: true });
    }

    const client = await pool.connect();

    try {
      const bookingResult = await client.query(
        'SELECT * FROM bookings WHERE payment_reference = $1',
        [data.reference]
      );

      if (bookingResult.rows.length === 0) {
        return res.json({ received: true });
      }

      const booking = bookingResult.rows[0];

      if (booking.payment_status === 'paid') {
        return res.json({ received: true });
      }

      await client.query('BEGIN');
      await finalizeSuccessfulPayment(client, booking, { data });
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
