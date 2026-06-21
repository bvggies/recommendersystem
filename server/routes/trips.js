const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getJwtSecret } = require('../utils/jwtSecret');
const {
  ALL_DAYS,
  buildRecurringSchedule,
  materializeRecurringInstances,
  deleteFutureGeneratedInstances
} = require('../utils/recurringTrips');
const { pauseTrips, resumeTrips, stopTrips } = require('../utils/tripStatusActions');
const { expirePastScheduledTrips } = require('../utils/expirePastTrips');

const router = express.Router();

// Get all trips with filters
// Allow optional authentication for admin to see all trips
router.get('/', async (req, res) => {
  // Try to authenticate but don't fail if no token (for public access)
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const user = jwt.verify(token, getJwtSecret());
        req.user = user;
      } catch (err) {
        // Invalid token, continue as unauthenticated
        req.user = null;
      }
    }
  }
  try {
    await materializeRecurringInstances(pool);
    await expirePastScheduledTrips(pool);

    const { origin, destination, min_fare, max_fare, vehicle_type, departure_date, status } = req.query;
    const trimmedOrigin = origin?.trim();
    const trimmedDestination = destination?.trim();
    const isAdmin = req.user && req.user.role === 'admin';
    const includeTemplates = req.query.include_templates === 'true' && isAdmin;

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

    if (trimmedOrigin) {
      query += ` AND t.origin ILIKE $${paramCount}`;
      params.push(`%${trimmedOrigin}%`);
      paramCount++;
    }

    if (trimmedDestination) {
      query += ` AND t.destination ILIKE $${paramCount}`;
      params.push(`%${trimmedDestination}%`);
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

    if (!includeTemplates) {
      query += ` AND t.is_recurring = false`;
    }

    if (status && status !== 'all') {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;

      // Scheduled search should only return bookable upcoming departures
      if (status === 'scheduled') {
        query += ` AND t.departure_time > NOW()`;
      }
    } else if (status !== 'all') {
      // Default for passengers: upcoming scheduled trips only
      if (!isAdmin) {
        query += ` AND t.status = 'scheduled' AND t.departure_time > NOW()`;
      }
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

// Get driver's trips (must be registered before /:id)
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

// Admin trip status controls (must be registered before /:id)
router.post('/:id/pause', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, note, scope = 'trip' } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const result = await pauseTrips(pool, {
      tripId: req.params.id,
      scope,
      reason,
      note
    });

    res.json({
      message: 'Trip paused successfully',
      ...result
    });
  } catch (error) {
    console.error('Pause trip error:', error);
    const status = error.message === 'Trip not found' ? 404 : error.message === 'Invalid status reason' ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to pause trip' });
  }
});

router.post('/:id/resume', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { scope = 'trip' } = req.body;

    const result = await resumeTrips(pool, {
      tripId: req.params.id,
      scope
    });

    if (scope === 'recurring') {
      await materializeRecurringInstances(pool);
    }

    res.json({
      message: 'Trip resumed successfully',
      ...result
    });
  } catch (error) {
    console.error('Resume trip error:', error);
    const status = error.message === 'Trip not found' ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to resume trip' });
  }
});

router.post('/:id/stop', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, note, scope = 'trip' } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const result = await stopTrips(pool, {
      tripId: req.params.id,
      scope,
      reason,
      note
    });

    res.json({
      message: 'Trip stopped successfully',
      ...result
    });
  } catch (error) {
    console.error('Stop trip error:', error);
    const status = error.message === 'Trip not found' ? 404 : error.message === 'Invalid status reason' ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to stop trip' });
  }
});

// Get single trip
router.get('/:id', async (req, res) => {
  try {
    await expirePastScheduledTrips(pool);

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

// Create trip (driver or admin)
router.post('/', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { driver_id, vehicle_id, route_id, origin, destination, fare, departure_time, total_seats, is_recurring, recurring_schedule, status } = req.body;

    if (!origin || !destination || !fare || !departure_time || !total_seats) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (is_recurring && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create recurring trips' });
    }

    const recurringDays = recurring_schedule?.days_of_week || ALL_DAYS;
    const finalRecurringSchedule = is_recurring
      ? buildRecurringSchedule(departure_time, recurringDays)
      : null;

    // Admin can specify driver_id, regular drivers use their own ID
    const finalDriverId = req.user.role === 'admin' ? (driver_id || null) : req.user.id;

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
      `INSERT INTO trips (driver_id, vehicle_id, route_id, origin, destination, fare, departure_time, total_seats, available_seats, is_recurring, recurring_schedule, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11)
       RETURNING *`,
      [finalDriverId, vehicle_id || null, finalRouteId, origin, destination, fare, departure_time, total_seats, is_recurring || false, finalRecurringSchedule, status || 'scheduled']
    );

    if (is_recurring) {
      await materializeRecurringInstances(pool);
    }

    res.status(201).json({ message: 'Trip created successfully', trip: result.rows[0] });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Update trip (driver or admin)
router.put('/:id', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { driver_id, vehicle_id, origin, destination, fare, departure_time, available_seats, total_seats, status, is_recurring, recurring_schedule } = req.body;

    // Check if trip belongs to driver
    const tripCheck = await pool.query('SELECT driver_id, is_recurring FROM trips WHERE id = $1', [req.params.id]);
    
    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (tripCheck.rows[0].driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this trip' });
    }

    if (is_recurring !== undefined && is_recurring && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can manage recurring trips' });
    }

    // Admin can change driver_id
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (req.user.role === 'admin' && driver_id) {
      updates.push(`driver_id = $${paramCount++}`);
      params.push(driver_id);
    }
    if (req.user.role === 'admin' && vehicle_id !== undefined) {
      updates.push(`vehicle_id = $${paramCount++}`);
      params.push(vehicle_id || null);
    }
    if (origin) {
      updates.push(`origin = $${paramCount++}`);
      params.push(origin);
    }
    if (destination) {
      updates.push(`destination = $${paramCount++}`);
      params.push(destination);
    }
    if (fare) {
      updates.push(`fare = $${paramCount++}`);
      params.push(fare);
    }
    if (departure_time) {
      updates.push(`departure_time = $${paramCount++}`);
      params.push(departure_time);
    }
    if (available_seats !== undefined) {
      updates.push(`available_seats = $${paramCount++}`);
      params.push(available_seats);
    }
    if (total_seats !== undefined) {
      updates.push(`total_seats = $${paramCount++}`);
      params.push(total_seats);
    }
    if (status) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (req.user.role === 'admin' && is_recurring !== undefined) {
      updates.push(`is_recurring = $${paramCount++}`);
      params.push(is_recurring);
    }
    if (req.user.role === 'admin' && is_recurring === true && departure_time) {
      const recurringDays = recurring_schedule?.days_of_week || ALL_DAYS;
      updates.push(`recurring_schedule = $${paramCount++}`);
      params.push(buildRecurringSchedule(departure_time, recurringDays));
    } else if (req.user.role === 'admin' && is_recurring === false) {
      updates.push(`recurring_schedule = $${paramCount++}`);
      params.push(null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);

    const result = await pool.query(
      `UPDATE trips 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    const updatedTrip = result.rows[0];

    if (req.user.role === 'admin' && updatedTrip.is_recurring) {
      await deleteFutureGeneratedInstances(pool, updatedTrip.id);
      await materializeRecurringInstances(pool);
    } else if (req.user.role === 'admin' && is_recurring === false && tripCheck.rows[0].is_recurring) {
      await deleteFutureGeneratedInstances(pool, updatedTrip.id);
    }

    res.json({ message: 'Trip updated successfully', trip: updatedTrip });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

// Delete trip (driver only)
router.delete('/:id', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const tripCheck = await pool.query('SELECT driver_id, is_recurring FROM trips WHERE id = $1', [req.params.id]);
    
    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (tripCheck.rows[0].driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this trip' });
    }

    if (tripCheck.rows[0].is_recurring) {
      await deleteFutureGeneratedInstances(pool, req.params.id);
    }

    await pool.query('DELETE FROM trips WHERE id = $1', [req.params.id]);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

module.exports = router;

