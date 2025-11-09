const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create rating
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { trip_id, driver_id, rating, review_text, comfort_rating, punctuality_rating } = req.body;

    if (!trip_id || !driver_id || !rating) {
      return res.status(400).json({ error: 'Trip ID, driver ID, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user has a booking for this trip
    const bookingCheck = await pool.query(
      'SELECT id FROM bookings WHERE passenger_id = $1 AND trip_id = $2 AND booking_status = $3',
      [req.user.id, trip_id, 'completed']
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only rate trips you have completed' });
    }

    // Check if already rated
    const existingRating = await pool.query(
      'SELECT id FROM ratings WHERE passenger_id = $1 AND trip_id = $2',
      [req.user.id, trip_id]
    );

    if (existingRating.rows.length > 0) {
      return res.status(400).json({ error: 'You have already rated this trip' });
    }

    const result = await pool.query(
      `INSERT INTO ratings (passenger_id, driver_id, trip_id, rating, review_text, comfort_rating, punctuality_rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, driver_id, trip_id, rating, review_text || null, comfort_rating || null, punctuality_rating || null]
    );

    res.status(201).json({ message: 'Rating submitted successfully', rating: result.rows[0] });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get ratings for a driver
router.get('/driver/:driver_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.full_name as passenger_name
       FROM ratings r
       JOIN users u ON r.passenger_id = u.id
       WHERE r.driver_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.driver_id]
    );

    const avgResult = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
       FROM ratings
       WHERE driver_id = $1`,
      [req.params.driver_id]
    );

    res.json({
      ratings: result.rows,
      average_rating: parseFloat(avgResult.rows[0].avg_rating) || 0,
      total_ratings: parseInt(avgResult.rows[0].total_ratings) || 0
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// Get ratings for a trip
router.get('/trip/:trip_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.full_name as passenger_name
       FROM ratings r
       JOIN users u ON r.passenger_id = u.id
       WHERE r.trip_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.trip_id]
    );

    res.json({ ratings: result.rows });
  } catch (error) {
    console.error('Get trip ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

module.exports = router;

