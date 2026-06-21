const express = require('express');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { notifyTripPassengers } = require('../utils/passengerAlerts');
const { getRouteEta } = require('../utils/googleMaps');

const router = express.Router();

async function getTripForDriver(tripId, userId, isAdmin) {
  const result = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  const trip = result.rows[0];

  if (!trip) {
    return { error: 'Trip not found', status: 404 };
  }

  if (!isAdmin && trip.driver_id !== userId) {
    return { error: 'Not authorized to manage this trip', status: 403 };
  }

  return { trip };
}

async function canViewTracking(tripId, userId, role) {
  if (role === 'admin') return true;

  const tripResult = await pool.query('SELECT driver_id FROM trips WHERE id = $1', [tripId]);
  if (tripResult.rows.length === 0) return false;
  if (tripResult.rows[0].driver_id === userId) return true;

  const bookingResult = await pool.query(
    `SELECT id FROM bookings
     WHERE trip_id = $1 AND passenger_id = $2
       AND booking_status IN ('confirmed', 'pending')
       AND booking_status != 'cancelled'`,
    [tripId, userId]
  );

  return bookingResult.rows.length > 0;
}

router.get('/:tripId', authenticateToken, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const allowed = await canViewTracking(tripId, req.user.id, req.user.role);

    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to view trip tracking' });
    }

    const tripResult = await pool.query(
      `SELECT t.id, t.origin, t.destination, t.departure_time, t.status,
              t.delay_minutes, t.delay_reason, t.estimated_arrival,
              t.last_latitude, t.last_longitude, t.last_location_at, t.tracking_active,
              u.full_name AS driver_name
       FROM trips t
       LEFT JOIN users u ON u.id = t.driver_id
       WHERE t.id = $1`,
      [tripId]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.rows[0];
    let liveEta = null;

    if (trip.tracking_active && trip.last_latitude && trip.last_longitude) {
      try {
        liveEta = await getRouteEta(
          `${trip.last_latitude},${trip.last_longitude}`,
          trip.destination
        );
      } catch (etaError) {
        liveEta = { message: etaError.message };
      }
    }

    const history = await pool.query(
      `SELECT latitude, longitude, heading, speed_kmh, recorded_at
       FROM trip_location_updates
       WHERE trip_id = $1
       ORDER BY recorded_at DESC
       LIMIT 20`,
      [tripId]
    );

    res.json({
      tracking: {
        ...trip,
        location_history: history.rows,
        live_eta: liveEta
      }
    });
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ error: 'Failed to get tracking information' });
  }
});

router.post('/:tripId/start', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { trip, error, status } = await getTripForDriver(
      req.params.tripId,
      req.user.id,
      req.user.role === 'admin'
    );

    if (error) {
      return res.status(status).json({ error });
    }

    const result = await pool.query(
      `UPDATE trips
       SET status = 'in-progress',
           tracking_active = TRUE,
           delay_minutes = 0,
           delay_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [trip.id]
    );

    res.json({ message: 'Live tracking started', trip: result.rows[0] });
  } catch (error) {
    console.error('Start tracking error:', error);
    res.status(500).json({ error: 'Failed to start tracking' });
  }
});

router.post('/:tripId/location', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { latitude, longitude, heading, speed_kmh } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const { trip, error, status } = await getTripForDriver(
      req.params.tripId,
      req.user.id,
      req.user.role === 'admin'
    );

    if (error) {
      return res.status(status).json({ error });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE trips
         SET last_latitude = $1,
             last_longitude = $2,
             last_location_at = CURRENT_TIMESTAMP,
             tracking_active = TRUE,
             status = CASE WHEN status = 'scheduled' THEN 'in-progress' ELSE status END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [latitude, longitude, trip.id]
      );

      await client.query(
        `INSERT INTO trip_location_updates (trip_id, driver_id, latitude, longitude, heading, speed_kmh)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [trip.id, req.user.id, latitude, longitude, heading || null, speed_kmh || null]
      );

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    res.json({ message: 'Location updated' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

router.post('/:tripId/delay', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { delay_minutes, reason } = req.body;

    if (!Number.isInteger(delay_minutes) || delay_minutes < 1) {
      return res.status(400).json({ error: 'delay_minutes must be a positive integer' });
    }

    const { trip, error, status } = await getTripForDriver(
      req.params.tripId,
      req.user.id,
      req.user.role === 'admin'
    );

    if (error) {
      return res.status(status).json({ error });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const updated = await client.query(
        `UPDATE trips
         SET delay_minutes = $1,
             delay_reason = $2,
             estimated_arrival = departure_time + ($1 || ' minutes')::interval,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [delay_minutes, reason || 'Operational delay', trip.id]
      );

      const message = `Trip ${trip.origin} → ${trip.destination} is delayed by ${delay_minutes} minutes.${reason ? ` Reason: ${reason}` : ''}`;
      await notifyTripPassengers(client, trip.id, 'Trip Delay Alert', message);

      await client.query('COMMIT');

      res.json({
        message: 'Delay reported and passengers notified',
        trip: updated.rows[0],
        notified: true
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Report delay error:', error);
    res.status(500).json({ error: 'Failed to report delay' });
  }
});

router.post('/:tripId/stop', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { trip, error, status } = await getTripForDriver(
      req.params.tripId,
      req.user.id,
      req.user.role === 'admin'
    );

    if (error) {
      return res.status(status).json({ error });
    }

    const result = await pool.query(
      `UPDATE trips
       SET tracking_active = FALSE,
           status = 'completed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [trip.id]
    );

    res.json({ message: 'Tracking stopped', trip: result.rows[0] });
  } catch (error) {
    console.error('Stop tracking error:', error);
    res.status(500).json({ error: 'Failed to stop tracking' });
  }
});

module.exports = router;
