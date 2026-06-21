const express = require('express');
const pool = require('../db/connection');
const { getRouteEta, isGoogleMapsConfigured } = require('../utils/googleMaps');

const router = express.Router();

async function cacheRouteEta(origin, destination, eta) {
  if (!eta.distance_km || !eta.duration_minutes) {
    return;
  }

  await pool.query(
    `UPDATE routes
     SET estimated_distance_km = $1,
         estimated_time_minutes = $2
     WHERE origin = $3 AND destination = $4`,
    [eta.distance_km, eta.duration_minutes, origin, destination]
  );
}

router.get('/config', (req, res) => {
  res.json({
    enabled: isGoogleMapsConfigured(),
    mock_mode: !isGoogleMapsConfigured()
  });
});

router.get('/eta', async (req, res) => {
  try {
    const origin = req.query.origin?.trim();
    const destination = req.query.destination?.trim();

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const routeResult = await pool.query(
      `SELECT estimated_distance_km, estimated_time_minutes
       FROM routes
       WHERE origin = $1 AND destination = $2`,
      [origin, destination]
    );

    const cached = routeResult.rows[0];
    if (cached?.estimated_distance_km && cached?.estimated_time_minutes && req.query.refresh !== 'true') {
      const eta = await getRouteEta(origin, destination);
      return res.json({
        eta: {
          origin,
          destination,
          distance_km: Number(cached.estimated_distance_km),
          duration_minutes: Number(cached.estimated_time_minutes),
          distance_text: `${cached.estimated_distance_km} km`,
          duration_text: `${cached.estimated_time_minutes} mins`,
          map_embed_url: eta.map_embed_url,
          source: 'cache'
        }
      });
    }

    const eta = await getRouteEta(origin, destination);
    await cacheRouteEta(origin, destination, eta);

    res.json({ eta });
  } catch (error) {
    console.error('Maps ETA error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate route ETA' });
  }
});

module.exports = router;
