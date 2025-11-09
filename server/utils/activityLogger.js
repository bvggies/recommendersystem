const pool = require('../db/connection');

/**
 * Log user activity to system_logs table
 * @param {number} userId - User ID (can be null for system actions)
 * @param {string} actionType - Type of action (e.g., 'login', 'create_trip', 'booking')
 * @param {object} actionDetails - Additional details about the action (optional)
 * @param {string} ipAddress - IP address of the user
 */
async function logActivity(userId, actionType, actionDetails = null, ipAddress = null) {
  try {
    await pool.query(
      `INSERT INTO system_logs (user_id, action_type, action_details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [userId, actionType, actionDetails ? JSON.stringify(actionDetails) : null, ipAddress]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error - logging should not break the main flow
  }
}

/**
 * Get client IP address from request
 * @param {object} req - Express request object
 * @returns {string} - IP address
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         null;
}

module.exports = {
  logActivity,
  getClientIp
};

