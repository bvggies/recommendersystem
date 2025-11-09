const express = require('express');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all trips with filters
router.get('/', async (req, res) => {
  try {
    const { origin, destination, min_fare, max_fare, vehicle_type, departure_date, status } = req.query;

    let query = `
      SELECT t.*, u.full_name as driver_name, u.phone as driver_phone,
             v.vehicle_type, v.registration_number, v.comfort_level,
             COALESCE(AVG(r.rating), 0) as avg_rating
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN ratings r ON r.driver_id = t.driver_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (origin) {
      query += ` AND t.origin ILIKE $${paramCount}`;
      params.push(`%${origin}%`);
      paramCount++;
    }

    if (destination) {
      query += ` AND t.destination ILIKE $${paramCount}`;
      params.push(`%${destination}%`);
      paramCount++;
    }

    if (min_fare) {
      query += ` AND t.fare >= $${paramCount}`;
      params.push(min_fare);
      paramCount++;
    }

    if (max_fare) {
      query += ` AND t.fare <= $${paramCount}`;
      params.push(max_fare);
      paramCount++;
    }

    if (vehicle_type) {
      query += ` AND v.vehicle_type = $${paramCount}`;
      params.push(vehicle_type);
      paramCount++;
    }

    if (departure_date) {
      query += ` AND DATE(t.departure_time) = $${paramCount}`;
      params.push(departure_date);
      paramCount++;
    }

    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    } else {
      query += ` AND t.status = 'scheduled' AND t.departure_time > NOW()`;
    }

    query += ` GROUP BY t.id, u.full_name, u.phone, v.vehicle_type, v.registration_number, v.comfort_level
               ORDER BY t.departure_time ASC`;

    const result = await pool.query(query, params);
    res.json({ trips: result.rows });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Failed to get trips' });
  }
});

// Get single trip
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.full_name as driver_name, u.phone as driver_phone,
              v.vehicle_type, v.registration_number, v.comfort_level,
              COALESCE(AVG(r.rating), 0) as avg_rating
       FROM trips t
       LEFT JOIN users u ON t.driver_id = u.id
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN ratings r ON r.driver_id = t.driver_id
       WHERE t.id = $1
       GROUP BY t.id, u.full_name, u.phone, v.vehicle_type, v.registration_number, v.comfort_level`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({ trip: result.rows[0] });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Failed to get trip' });
  }
});

// Create trip (driver only)
router.post('/', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { vehicle_id, route_id, origin, destination, fare, departure_time, total_seats, is_recurring, recurring_schedule } = req.body;

    if (!origin || !destination || !fare || !departure_time || !total_seats) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get or create route
    let finalRouteId = route_id;
    if (!finalRouteId) {
      const routeResult = await pool.query(
        'SELECT id FROM routes WHERE origin = $1 AND destination = $2',
        [origin, destination]
      );

      if (routeResult.rows.length === 0) {
        const newRoute = await pool.query(
          'INSERT INTO routes (origin, destination) VALUES ($1, $2) RETURNING id',
          [origin, destination]
        );
        finalRouteId = newRoute.rows[0].id;
      } else {
        finalRouteId = routeResult.rows[0].id;
      }
    }

    // Create trip
    const result = await pool.query(
      `INSERT INTO trips (driver_id, vehicle_id, route_id, origin, destination, fare, departure_time, total_seats, available_seats, is_recurring, recurring_schedule)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10)
       RETURNING *`,
      [req.user.id, vehicle_id || null, finalRouteId, origin, destination, fare, departure_time, total_seats, is_recurring || false, recurring_schedule || null]
    );

    res.status(201).json({ message: 'Trip created successfully', trip: result.rows[0] });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Update trip (driver only)
router.put('/:id', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { origin, destination, fare, departure_time, available_seats, status } = req.body;

    // Check if trip belongs to driver
    const tripCheck = await pool.query('SELECT driver_id FROM trips WHERE id = $1', [req.params.id]);
    
    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (tripCheck.rows[0].driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this trip' });
    }

    const result = await pool.query(
      `UPDATE trips 
       SET origin = COALESCE($1, origin),
           destination = COALESCE($2, destination),
           fare = COALESCE($3, fare),
           departure_time = COALESCE($4, departure_time),
           available_seats = COALESCE($5, available_seats),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [origin, destination, fare, departure_time, available_seats, status, req.params.id]
    );

    res.json({ message: 'Trip updated successfully', trip: result.rows[0] });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

// Delete trip (driver only)
router.delete('/:id', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const tripCheck = await pool.query('SELECT driver_id FROM trips WHERE id = $1', [req.params.id]);
    
    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (tripCheck.rows[0].driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this trip' });
    }

    await pool.query('DELETE FROM trips WHERE id = $1', [req.params.id]);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

// Get driver's trips
router.get('/driver/my-trips', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, v.vehicle_type, v.registration_number,
              COUNT(b.id) as bookings_count
       FROM trips t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN bookings b ON b.trip_id = t.id
       WHERE t.driver_id = $1
       GROUP BY t.id, v.vehicle_type, v.registration_number
       ORDER BY t.departure_time DESC`,
      [req.user.id]
    );

    res.json({ trips: result.rows });
  } catch (error) {
    console.error('Get driver trips error:', error);
    res.status(500).json({ error: 'Failed to get trips' });
  }
});

module.exports = router;

