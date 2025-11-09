const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { trip_id, seats_booked = 1 } = req.body;

    if (!trip_id) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    // Check trip availability
    const tripResult = await pool.query(
      'SELECT available_seats, driver_id FROM trips WHERE id = $1 AND status = $2',
      [trip_id, 'scheduled']
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found or not available' });
    }

    const trip = tripResult.rows[0];

    if (trip.driver_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot book your own trip' });
    }

    if (trip.available_seats < seats_booked) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    // Check if user already booked this trip
    const existingBooking = await pool.query(
      'SELECT id FROM bookings WHERE passenger_id = $1 AND trip_id = $2 AND booking_status != $3',
      [req.user.id, trip_id, 'cancelled']
    );

    if (existingBooking.rows.length > 0) {
      return res.status(400).json({ error: 'You have already booked this trip' });
    }

    // Create booking
    const bookingResult = await pool.query(
      `INSERT INTO bookings (passenger_id, trip_id, seats_booked)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, trip_id, seats_booked]
    );

    // Update available seats
    await pool.query(
      'UPDATE trips SET available_seats = available_seats - $1 WHERE id = $2',
      [seats_booked, trip_id]
    );

    // Create notification for driver
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message)
       VALUES ($1, 'booking', 'New Booking', $2)`,
      [trip.driver_id, `New booking for ${seats_booked} seat(s) on your trip`]
    );

    res.status(201).json({ message: 'Booking created successfully', booking: bookingResult.rows[0] });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get user bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, t.origin, t.destination, t.fare, t.departure_time, t.status as trip_status,
              u.full_name as driver_name, v.vehicle_type, v.registration_number
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN users u ON t.driver_id = u.id
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       WHERE b.passenger_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Cancel booking
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const bookingResult = await pool.query(
      `SELECT b.*, t.driver_id, t.id as trip_id
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       WHERE b.id = $1 AND b.passenger_id = $2`,
      [req.params.id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Cancel booking
    await pool.query(
      'UPDATE bookings SET booking_status = $1 WHERE id = $2',
      ['cancelled', req.params.id]
    );

    // Restore seats
    await pool.query(
      'UPDATE trips SET available_seats = available_seats + $1 WHERE id = $2',
      [booking.seats_booked, booking.trip_id]
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;

