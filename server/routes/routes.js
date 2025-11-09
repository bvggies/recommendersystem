const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

// Get all routes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
              COUNT(DISTINCT t.id) as trip_count,
              AVG(t.fare) as avg_fare,
              MIN(t.fare) as min_fare,
              MAX(t.fare) as max_fare
       FROM routes r
       LEFT JOIN trips t ON t.route_id = r.id AND t.status = 'scheduled'
       GROUP BY r.id
       ORDER BY trip_count DESC, r.origin, r.destination`
    );

    res.json({ routes: result.rows });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to get routes' });
  }
});

// Get popular routes
router.get('/popular', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
              COUNT(DISTINCT t.id) as trip_count,
              COUNT(DISTINCT b.id) as booking_count,
              AVG(t.fare) as avg_fare
       FROM routes r
       LEFT JOIN trips t ON t.route_id = r.id
       LEFT JOIN bookings b ON b.trip_id = t.id
       GROUP BY r.id
       HAVING COUNT(DISTINCT b.id) > 0
       ORDER BY booking_count DESC, trip_count DESC
       LIMIT 10`
    );

    res.json({ routes: result.rows });
  } catch (error) {
    console.error('Get popular routes error:', error);
    res.status(500).json({ error: 'Failed to get popular routes' });
  }
});

// Get route details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
              COUNT(DISTINCT t.id) as trip_count,
              AVG(t.fare) as avg_fare
       FROM routes r
       LEFT JOIN trips t ON t.route_id = r.id
       WHERE r.id = $1
       GROUP BY r.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({ route: result.rows[0] });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ error: 'Failed to get route' });
  }
});

module.exports = router;

