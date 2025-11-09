const express = require('express');
const pool = require('../db/connection');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'passenger') as total_passengers,
        (SELECT COUNT(*) FROM users WHERE role = 'driver') as total_drivers,
        (SELECT COUNT(*) FROM trips) as total_trips,
        (SELECT COUNT(*) FROM trips WHERE status = 'scheduled') as scheduled_trips,
        (SELECT COUNT(*) FROM trips WHERE status = 'in-progress') as in_progress_trips,
        (SELECT COUNT(*) FROM trips WHERE status = 'completed') as completed_trips,
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed') as confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE booking_status = 'cancelled') as cancelled_bookings,
        (SELECT AVG(rating) FROM ratings) as avg_rating,
        (SELECT COUNT(*) FROM ratings) as total_ratings,
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(DISTINCT ip_address) FROM system_logs WHERE ip_address IS NOT NULL) as unique_ips,
        (SELECT COUNT(*) FROM system_logs WHERE created_at >= NOW() - INTERVAL '24 hours') as activities_24h,
        (SELECT COUNT(*) FROM system_logs WHERE created_at >= NOW() - INTERVAL '7 days') as activities_7d,
        (SELECT SUM(fare * (total_seats - available_seats)) FROM trips WHERE status = 'completed') as total_revenue
    `);

    // Get recent user activities with IP addresses
    const activities = await pool.query(`
      SELECT 
        l.*,
        u.username,
        u.role,
        u.full_name,
        u.email
      FROM system_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 20
    `);

    // Get top active users
    const topUsers = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role,
        u.email,
        COUNT(l.id) as activity_count,
        MAX(l.created_at) as last_activity,
        COUNT(DISTINCT l.ip_address) as unique_ips
      FROM users u
      LEFT JOIN system_logs l ON u.id = l.user_id
      WHERE l.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY u.id, u.username, u.full_name, u.role, u.email
      ORDER BY activity_count DESC
      LIMIT 10
    `);

    // Get IP address statistics
    const ipStats = await pool.query(`
      SELECT 
        ip_address,
        COUNT(*) as request_count,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as last_seen
      FROM system_logs
      WHERE ip_address IS NOT NULL
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY ip_address
      ORDER BY request_count DESC
      LIMIT 10
    `);

    res.json({ 
      stats: stats.rows[0],
      recentActivities: activities.rows,
      topUsers: topUsers.rows,
      ipStats: ipStats.rows
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Get system logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT l.*, u.username, u.role
       FROM system_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Manage users
router.put('/users/:id/suspend', async (req, res) => {
  try {
    // In a real system, you'd have an is_suspended field
    // For now, we'll just log the action
    await pool.query(
      'INSERT INTO system_logs (user_id, action_type, action_details) VALUES ($1, $2, $3)',
      [req.user.id, 'suspend_user', JSON.stringify({ target_user_id: req.params.id })]
    );

    res.json({ message: 'User suspended (feature to be implemented)' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7' } = req.query; // days

    const analytics = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as trips_count,
        SUM(available_seats) as total_seats,
        AVG(fare) as avg_fare
      FROM trips
      WHERE created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({ analytics: analytics.rows });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;

