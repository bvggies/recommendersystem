const express = require('express');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all vehicles (admin only) or driver's vehicles
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.full_name as driver_name, u.phone as driver_phone
       FROM vehicles v
       LEFT JOIN users u ON v.driver_id = u.id
       ORDER BY v.created_at DESC`
    );

    res.json({ vehicles: result.rows });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to get vehicles' });
  }
});

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
    const { driver_id, vehicle_type, registration_number, comfort_level, capacity } = req.body;

    if (!vehicle_type || !registration_number || !capacity) {
      return res.status(400).json({ error: 'Vehicle type, registration number, and capacity are required' });
    }

    // Admin can assign to any driver, regular drivers can only assign to themselves
    const finalDriverId = req.user.role === 'admin' ? (driver_id || null) : req.user.id;

    const result = await pool.query(
      `INSERT INTO vehicles (driver_id, vehicle_type, registration_number, comfort_level, capacity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [finalDriverId, vehicle_type, registration_number, comfort_level || 'standard', capacity]
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

// Update vehicle
router.put('/:id', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const { driver_id, vehicle_type, registration_number, comfort_level, capacity } = req.body;

    // Check if vehicle exists and belongs to driver (unless admin)
    const vehicleCheck = await pool.query('SELECT driver_id FROM vehicles WHERE id = $1', [req.params.id]);
    
    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (vehicleCheck.rows[0].driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this vehicle' });
    }

    const finalDriverId = req.user.role === 'admin' ? (driver_id !== undefined ? driver_id : vehicleCheck.rows[0].driver_id) : vehicleCheck.rows[0].driver_id;

    const result = await pool.query(
      `UPDATE vehicles 
       SET driver_id = COALESCE($1, driver_id),
           vehicle_type = COALESCE($2, vehicle_type),
           registration_number = COALESCE($3, registration_number),
           comfort_level = COALESCE($4, comfort_level),
           capacity = COALESCE($5, capacity)
       WHERE id = $6
       RETURNING *`,
      [finalDriverId, vehicle_type, registration_number, comfort_level, capacity, req.params.id]
    );

    res.json({ message: 'Vehicle updated successfully', vehicle: result.rows[0] });
  } catch (error) {
    console.error('Update vehicle error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Vehicle with this registration number already exists' });
    }
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Delete vehicle
router.delete('/:id', authenticateToken, authorizeRoles('driver', 'admin'), async (req, res) => {
  try {
    const vehicleCheck = await pool.query('SELECT driver_id FROM vehicles WHERE id = $1', [req.params.id]);
    
    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (vehicleCheck.rows[0].driver_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this vehicle' });
    }

    await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

module.exports = router;

