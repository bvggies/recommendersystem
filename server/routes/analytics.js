const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get passenger demand analysis
router.get('/demand', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.origin,
        r.destination,
        COUNT(DISTINCT t.id) as trip_count,
        COUNT(DISTINCT b.id) as booking_count,
        AVG(t.fare) as avg_fare
      FROM routes r
      LEFT JOIN trips t ON t.route_id = r.id
      LEFT JOIN bookings b ON b.trip_id = t.id
      WHERE t.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY r.id, r.origin, r.destination
      ORDER BY booking_count DESC
      LIMIT 10
    `);

    res.json({ demand_analysis: result.rows });
  } catch (error) {
    console.error('Get demand analysis error:', error);
    res.status(500).json({ error: 'Failed to get demand analysis' });
  }
});

// Get driver performance
router.get('/driver-performance', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.username,
        COUNT(DISTINCT t.id) as total_trips,
        COUNT(DISTINCT b.id) as total_bookings,
        AVG(r.rating) as avg_rating,
        COUNT(r.id) as total_ratings
      FROM users u
      LEFT JOIN trips t ON t.driver_id = u.id
      LEFT JOIN bookings b ON b.trip_id = t.id
      LEFT JOIN ratings r ON r.driver_id = u.id
      WHERE u.role = 'driver'
      GROUP BY u.id, u.full_name, u.username
      ORDER BY avg_rating DESC, total_bookings DESC
    `);

    res.json({ driver_performance: result.rows });
  } catch (error) {
    console.error('Get driver performance error:', error);
    res.status(500).json({ error: 'Failed to get driver performance' });
  }
});

// Get revenue analytics
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const result = await pool.query(`
      SELECT 
        DATE(t.departure_time) as date,
        COUNT(DISTINCT t.id) as trips_count,
        COUNT(b.id) as bookings_count,
        SUM(t.fare * b.seats_booked) as total_revenue,
        AVG(t.fare * b.seats_booked) as avg_revenue_per_booking
      FROM trips t
      LEFT JOIN bookings b ON b.trip_id = t.id AND b.booking_status = 'confirmed'
      WHERE t.departure_time >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(t.departure_time)
      ORDER BY date ASC
    `);

    res.json({ revenue_analytics: result.rows });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to get revenue analytics' });
  }
});

module.exports = router;

