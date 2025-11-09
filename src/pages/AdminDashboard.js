import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/logs?limit=10')
      ]);
      setStats(statsRes.data.stats || {});
      setRecentActivity(logsRes.data.logs || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const status = error.response?.status;
      console.log('Dashboard error details:', {
        status,
        error: errorMsg,
        hasToken: !!localStorage.getItem('token')
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-loading">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>⚠️ Access Denied</h2>
          <p>You need admin privileges to access this page.</p>
          <p>Current role: <strong>{user?.role || 'Not logged in'}</strong></p>
          <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
            To create an admin user, run: <code>npm run create-admin</code> in the server directory
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-content">
          <h1>👨‍💼 Admin Dashboard</h1>
          <p>Welcome back, {user?.full_name || user?.username}</p>
        </div>
        <div className="header-actions">
          <button onClick={loadDashboardData} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card users">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.total_users || 0}</h3>
            <p>Total Users</p>
            <div className="stat-breakdown">
              <span>{stats.total_passengers || 0} Passengers</span>
              <span>{stats.total_drivers || 0} Drivers</span>
            </div>
          </div>
        </div>

        <div className="stat-card trips">
          <div className="stat-icon">🚌</div>
          <div className="stat-info">
            <h3>{stats.total_trips || 0}</h3>
            <p>Total Trips</p>
            <div className="stat-breakdown">
              <span>{stats.scheduled_trips || 0} Scheduled</span>
            </div>
          </div>
        </div>

        <div className="stat-card bookings">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{stats.total_bookings || 0}</h3>
            <p>Total Bookings</p>
            <div className="stat-breakdown">
              <span>{stats.confirmed_bookings || 0} Confirmed</span>
            </div>
          </div>
        </div>

        <div className="stat-card ratings">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <h3>{stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : 'N/A'}</h3>
            <p>Average Rating</p>
            <div className="stat-breakdown">
              <span>{stats.total_ratings || 0} Reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/admin/vehicles" className="action-card">
            <div className="action-icon">🚗</div>
            <h3>Manage Vehicles</h3>
            <p>Add, edit, or remove buses and cars</p>
          </Link>

          <Link to="/admin/drivers" className="action-card">
            <div className="action-icon">👨‍✈️</div>
            <h3>Manage Drivers</h3>
            <p>View and manage driver accounts</p>
          </Link>

          <Link to="/admin/passengers" className="action-card">
            <div className="action-icon">👤</div>
            <h3>Manage Passengers</h3>
            <p>View and manage passenger accounts</p>
          </Link>

          <Link to="/admin/trips" className="action-card">
            <div className="action-icon">📅</div>
            <h3>Manage Trips</h3>
            <p>View, edit, and manage all trips</p>
          </Link>

          <Link to="/admin/departures" className="action-card">
            <div className="action-icon">✈️</div>
            <h3>Departures & Arrivals</h3>
            <p>Manage departures and arrivals board</p>
          </Link>

          <Link to="/admin/analytics" className="action-card">
            <div className="action-icon">📊</div>
            <h3>Analytics</h3>
            <p>View system analytics and reports</p>
          </Link>

          <Link to="/admin/logs" className="action-card">
            <div className="action-icon">📝</div>
            <h3>System Logs</h3>
            <p>View system activity logs</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-section">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {activity.action_type === 'login' ? '🔐' : 
                   activity.action_type === 'create_trip' ? '🚌' :
                   activity.action_type === 'booking' ? '📋' : '📝'}
                </div>
                <div className="activity-content">
                  <p className="activity-title">{activity.action_type}</p>
                  <p className="activity-details">{activity.action_details || 'No details'}</p>
                  <span className="activity-time">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
                {activity.username && (
                  <div className="activity-user">
                    {activity.username} ({activity.role})
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="no-activity">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

