const express = require('express');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get driver's vehicles
router.get('/driver', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vehicles WHERE driver_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ vehicles: result.rows });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to get vehicles' });
  }
});

// Create vehicle
router.post('/', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { vehicle_type, registration_number, comfort_level, capacity } = req.body;

    if (!vehicle_type || !registration_number || !capacity) {
      return res.status(400).json({ error: 'Vehicle type, registration number, and capacity are required' });
    }

    const result = await pool.query(
      `INSERT INTO vehicles (driver_id, vehicle_type, registration_number, comfort_level, capacity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, vehicle_type, registration_number, comfort_level || 'standard', capacity]
    );

    res.status(201).json({ message: 'Vehicle created successfully', vehicle: result.rows[0] });
  } catch (error) {
    console.error('Create vehicle error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Vehicle with this registration number already exists' });
    }
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

module.exports = router;

