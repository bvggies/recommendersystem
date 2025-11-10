const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, phone, station_id, role, full_name, profile_picture, 
       fare_range_min, fare_range_max, preferred_routes, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, fare_range_min, fare_range_max, preferred_routes, profile_picture } = req.body;

    // Convert empty strings to null for optional fields
    const processedFullName = full_name && full_name.trim() !== '' ? full_name.trim() : null;
    const processedPhone = phone && phone.trim() !== '' ? phone.trim() : null;
    const processedFareMin = fare_range_min !== '' && fare_range_min !== null && fare_range_min !== undefined 
      ? (isNaN(parseFloat(fare_range_min)) ? null : parseFloat(fare_range_min)) : null;
    const processedFareMax = fare_range_max !== '' && fare_range_max !== null && fare_range_max !== undefined 
      ? (isNaN(parseFloat(fare_range_max)) ? null : parseFloat(fare_range_max)) : null;
    const processedPreferredRoutes = Array.isArray(preferred_routes) ? preferred_routes : null;
    const processedProfilePicture = profile_picture && profile_picture.trim() !== '' ? profile_picture.trim() : null;

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           fare_range_min = COALESCE($3, fare_range_min),
           fare_range_max = COALESCE($4, fare_range_max),
           preferred_routes = COALESCE($5, preferred_routes),
           profile_picture = COALESCE($6, profile_picture),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, username, email, phone, full_name, profile_picture, fare_range_min, fare_range_max, preferred_routes`,
      [processedFullName, processedPhone, processedFareMin, processedFareMax, processedPreferredRoutes, processedProfilePicture, req.user.id]
    );

    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    // Return more detailed error message
    const errorMessage = error.message || 'Failed to update profile';
    res.status(500).json({ error: 'Failed to update profile', details: errorMessage });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Get current password hash
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, username, email, phone, role, full_name, created_at FROM users';
    const params = [];
    
    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { username, email, phone, password, full_name, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Username, email, password, and role are required' });
    }

    if (!['passenger', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be passenger, driver, or admin' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (username, email, phone, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, phone, role, full_name, created_at`,
      [username, email, phone || null, passwordHash, full_name || null, role]
    );

    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      const field = error.constraint.includes('email') ? 'email' : 
                   error.constraint.includes('username') ? 'username' : 'phone';
      return res.status(400).json({ error: `User with this ${field} already exists` });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { username, email, phone, full_name, role, password } = req.body;

    if (role && !['passenger', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be passenger, driver, or admin' });
    }

    let passwordHash = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (username) {
      updates.push(`username = $${paramCount++}`);
      params.push(username);
    }
    if (email) {
      updates.push(`email = $${paramCount++}`);
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      params.push(phone);
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      params.push(full_name);
    }
    if (role) {
      updates.push(`role = $${paramCount++}`);
      params.push(role);
    }
    if (passwordHash) {
      updates.push(`password_hash = $${paramCount++}`);
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);

    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, phone, role, full_name, created_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '23505') {
      const field = error.constraint.includes('email') ? 'email' : 
                   error.constraint.includes('username') ? 'username' : 'phone';
      return res.status(400).json({ error: `User with this ${field} already exists` });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

