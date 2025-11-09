const jwt = require('jsonwebtoken');
const pool = require('../db/connection');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // For admin routes, verify role from database to ensure it's up-to-date
    // This handles cases where user role was changed but token wasn't refreshed
    if (roles.includes('admin')) {
      try {
        const result = await pool.query(
          'SELECT role FROM users WHERE id = $1',
          [req.user.id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const dbRole = result.rows[0].role;
        
        // Update req.user.role with database role
        req.user.role = dbRole;

        if (!roles.includes(dbRole)) {
          console.log('Access denied - role mismatch:', {
            tokenRole: req.user.role,
            dbRole: dbRole,
            requiredRoles: roles,
            userId: req.user.id
          });
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            details: `Required roles: ${roles.join(', ')}, Your role: ${dbRole}. Please log out and log back in to refresh your token.`
          });
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        // Fall back to token role if database check fails
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            details: `Required roles: ${roles.join(', ')}, Your role: ${req.user.role}`
          });
        }
      }
    } else {
      // For non-admin routes, just check token role
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          details: `Required roles: ${roles.join(', ')}, Your role: ${req.user.role}`
        });
      }
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };

