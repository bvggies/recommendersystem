const express = require('express');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { buildTicketPayload, parseTicketPayload } = require('../utils/boardingToken');
const { ensureBoardingToken } = require('../utils/bookingTickets');

const router = express.Router();

// Create booking (legacy direct booking — prefer /api/payments/initialize)
router.post('/', authenticateToken, async (req, res) => {
  const { trip_id, seats_booked = 1, skip_payment = false } = req.body;

  if (!trip_id) {
    return res.status(400).json({ error: 'Trip ID is required' });
  }

  if (!Number.isInteger(seats_booked) || seats_booked < 1) {
    return res.status(400).json({ error: 'seats_booked must be a positive integer' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query(
      `SELECT available_seats, driver_id, status
       FROM trips
       WHERE id = $1 AND status = 'scheduled'
       FOR UPDATE`,
      [trip_id]
    );

    if (tripResult.rows.length === 0) {
      await client.query('ROLLBACK');

      const pausedCheck = await client.query(
        'SELECT status FROM trips WHERE id = $1',
        [trip_id]
      );

      if (pausedCheck.rows[0]?.status === 'paused') {
        return res.status(409).json({
          error: 'This trip is temporarily paused and cannot be booked right now'
        });
      }

      return res.status(404).json({ error: 'Trip not found or not available' });
    }

    const trip = tripResult.rows[0];

    if (trip.driver_id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot book your own trip' });
    }

    if (trip.available_seats < seats_booked) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    const existingBooking = await client.query(
      'SELECT id FROM bookings WHERE passenger_id = $1 AND trip_id = $2 AND booking_status != $3',
      [req.user.id, trip_id, 'cancelled']
    );

    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You have already booked this trip' });
    }

    const seatUpdate = await client.query(
      `UPDATE trips
       SET available_seats = available_seats - $1
       WHERE id = $2 AND available_seats >= $1
       RETURNING available_seats`,
      [seats_booked, trip_id]
    );

    if (seatUpdate.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Not enough seats available' });
    }

    const bookingResult = await client.query(
      `INSERT INTO bookings (passenger_id, trip_id, seats_booked, booking_status, payment_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.id,
        trip_id,
        seats_booked,
        skip_payment ? 'confirmed' : 'pending',
        skip_payment ? 'paid' : 'pending'
      ]
    );

    await client.query(
      `INSERT INTO notifications (user_id, notification_type, title, message)
       VALUES ($1, 'booking', 'New Booking', $2)`,
      [trip.driver_id, `New booking for ${seats_booked} seat(s) on your trip`]
    );

    if (skip_payment) {
      await ensureBoardingToken(client, bookingResult.rows[0].id);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: skip_payment
        ? 'Booking created successfully'
        : 'Booking created. Complete payment to confirm your seat.',
      booking: bookingResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  } finally {
    client.release();
  }
});

// Get user bookings (includes trip history with verification status)
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let statusFilter = '';

    if (status === 'upcoming') {
      statusFilter = `AND b.booking_status != 'cancelled'
        AND b.payment_status = 'paid'
        AND t.departure_time > NOW()
        AND t.status IN ('scheduled', 'in-progress', 'paused')`;
    } else if (status === 'history') {
      statusFilter = `AND b.booking_status != 'cancelled'
        AND b.payment_status = 'paid'
        AND (
          t.departure_time <= NOW()
          OR t.status IN ('completed', 'cancelled')
          OR b.booking_status = 'completed'
        )`;
    }

    const result = await pool.query(
      `SELECT b.*, t.origin, t.destination, t.fare, t.departure_time, t.status as trip_status,
              u.full_name as driver_name, v.vehicle_type, v.registration_number,
              CASE WHEN b.checked_in_at IS NOT NULL THEN TRUE ELSE FALSE END AS verified
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN users u ON t.driver_id = u.id
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       WHERE b.passenger_id = $1 ${statusFilter}
       ORDER BY t.departure_time DESC, b.created_at DESC`,
      [req.user.id]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// User's booking for a specific trip (for trip detail + history verification)
router.get('/trip/:tripId/mine', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, t.origin, t.destination, t.fare, t.departure_time, t.status AS trip_status,
              u.full_name AS driver_name, v.vehicle_type, v.registration_number,
              CASE WHEN b.checked_in_at IS NOT NULL THEN TRUE ELSE FALSE END AS verified
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN users u ON t.driver_id = u.id
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       WHERE b.passenger_id = $1
         AND b.trip_id = $2
         AND b.booking_status != 'cancelled'
       ORDER BY b.created_at DESC
       LIMIT 1`,
      [req.user.id, req.params.tripId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No booking found for this trip' });
    }

    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Get trip booking error:', error);
    res.status(500).json({ error: 'Failed to get booking for trip' });
  }
});

// Driver/admin: passengers on a trip (for check-in roster)
router.get('/for-trip/:tripId/passengers', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const tripId = req.params.tripId;

    const tripResult = await pool.query('SELECT driver_id FROM trips WHERE id = $1', [tripId]);
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (req.user.role !== 'admin' && tripResult.rows[0].driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view passengers for this trip' });
    }

    const result = await pool.query(
      `SELECT b.id, b.seats_booked, b.booking_status, b.payment_status,
              b.checked_in_at, b.boarding_token,
              u.full_name AS passenger_name, u.phone
       FROM bookings b
       JOIN users u ON u.id = b.passenger_id
       WHERE b.trip_id = $1
         AND b.booking_status IN ('confirmed', 'pending')
         AND b.booking_status != 'cancelled'
       ORDER BY b.created_at ASC`,
      [tripId]
    );

    res.json({ passengers: result.rows });
  } catch (error) {
    console.error('Get trip passengers error:', error);
    res.status(500).json({ error: 'Failed to get passenger list' });
  }
});

// Boarding check-in (driver/admin scans or enters ticket code)
router.post('/check-in', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { ticket_code, boarding_token, trip_id } = req.body;

    let bookingId;
    let token = boarding_token;

    if (ticket_code) {
      const parsed = parseTicketPayload(ticket_code);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid ticket code format' });
      }
      bookingId = parsed.bookingId;
      token = parsed.boardingToken;
    } else if (boarding_token) {
      const lookup = await pool.query(
        'SELECT id FROM bookings WHERE boarding_token = $1',
        [boarding_token]
      );
      if (lookup.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      bookingId = lookup.rows[0].id;
    } else {
      return res.status(400).json({ error: 'ticket_code or boarding_token is required' });
    }

    const bookingResult = await pool.query(
      `SELECT b.*, t.driver_id, t.origin, t.destination, t.departure_time,
              u.full_name AS passenger_name
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN users u ON u.id = b.passenger_id
       WHERE b.id = $1 AND b.boarding_token = $2`,
      [bookingId, token]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid ticket' });
    }

    const booking = bookingResult.rows[0];

    if (req.user.role !== 'admin' && booking.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to check in passengers for this trip' });
    }

    if (trip_id && parseInt(trip_id, 10) !== booking.trip_id) {
      return res.status(400).json({ error: 'Ticket is for a different trip' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ error: 'Booking has been cancelled' });
    }

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed for this booking' });
    }

    if (booking.checked_in_at) {
      return res.status(409).json({
        error: 'Passenger already checked in',
        booking,
        checked_in_at: booking.checked_in_at
      });
    }

    const updated = await pool.query(
      `UPDATE bookings
       SET checked_in_at = CURRENT_TIMESTAMP,
           checked_in_by = $1,
           booking_status = 'confirmed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, booking.id]
    );

    res.json({
      message: `${booking.passenger_name} checked in successfully`,
      booking: {
        ...updated.rows[0],
        passenger_name: booking.passenger_name,
        origin: booking.origin,
        destination: booking.destination,
        departure_time: booking.departure_time
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in passenger' });
  }
});

// QR ticket for passenger
router.get('/:id/ticket', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, t.origin, t.destination, t.departure_time, t.status AS trip_status,
              u.full_name AS driver_name, v.vehicle_type, v.registration_number
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN users u ON t.driver_id = u.id
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this ticket' });
    }

    if (booking.payment_status !== 'paid' || booking.booking_status === 'cancelled') {
      return res.status(400).json({ error: 'Ticket not available for this booking' });
    }

    const client = await pool.connect();
    let boardingToken;

    try {
      boardingToken = await ensureBoardingToken(client, booking.id);
    } finally {
      client.release();
    }

    res.json({
      ticket: {
        booking_id: booking.id,
        passenger_id: booking.passenger_id,
        seats_booked: booking.seats_booked,
        origin: booking.origin,
        destination: booking.destination,
        departure_time: booking.departure_time,
        trip_status: booking.trip_status,
        driver_name: booking.driver_name,
        vehicle_type: booking.vehicle_type,
        registration_number: booking.registration_number,
        checked_in_at: booking.checked_in_at,
        verified: Boolean(booking.checked_in_at),
        is_historical: new Date(booking.departure_time) < new Date()
          || booking.trip_status === 'completed'
          || booking.booking_status === 'completed',
        boarding_token: boardingToken,
        qr_payload: buildTicketPayload(booking.id, boardingToken)
      }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

// Cancel booking
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.*, t.driver_id, t.id as trip_id
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       WHERE b.id = $1 AND b.passenger_id = $2
       FOR UPDATE OF b`,
      [req.params.id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.booking_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    await client.query(
      'UPDATE bookings SET booking_status = $1 WHERE id = $2',
      ['cancelled', req.params.id]
    );

    await client.query(
      'UPDATE trips SET available_seats = available_seats + $1 WHERE id = $2',
      [booking.seats_booked, booking.trip_id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

module.exports = router;
