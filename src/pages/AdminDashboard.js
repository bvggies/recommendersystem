import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [ipStats, setIpStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data.stats || {});
      setRecentActivities(response.data.recentActivities || []);
      setTopUsers(response.data.topUsers || []);
      setIpStats(response.data.ipStats || []);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (actionType) => {
    const icons = {
      'login': '🔐',
      'logout': '🚪',
      'create_trip': '🚌',
      'update_trip': '✏️',
      'delete_trip': '🗑️',
      'booking': '📋',
      'cancel_booking': '❌',
      'rating': '⭐',
      'register': '👤',
      'update_profile': '📝'
    };
    return icons[actionType] || '📝';
  };

  return (
    <div className="admin-dashboard-mobile">
      {/* Header */}
      <div className="admin-header-mobile">
        <div className="header-content-mobile">
          <h1>👨‍💼 Admin Dashboard</h1>
          <p>Welcome back, {user?.full_name || user?.username}</p>
        </div>
        <button onClick={loadDashboardData} className="refresh-btn-mobile">
          🔄 Refresh
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid-mobile">
        <div className="stat-card-mobile users">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">👥</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{stats.total_users || 0}</h3>
            <p>Total Users</p>
            <div className="stat-breakdown-mobile">
              <span>{stats.total_passengers || 0} Passengers</span>
              <span>{stats.total_drivers || 0} Drivers</span>
            </div>
          </div>
        </div>

        <div className="stat-card-mobile trips">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">🚌</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{stats.total_trips || 0}</h3>
            <p>Total Trips</p>
            <div className="stat-breakdown-mobile">
              <span>{stats.scheduled_trips || 0} Scheduled</span>
              <span>{stats.completed_trips || 0} Completed</span>
            </div>
          </div>
        </div>

        <div className="stat-card-mobile bookings">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">📋</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{stats.total_bookings || 0}</h3>
            <p>Total Bookings</p>
            <div className="stat-breakdown-mobile">
              <span>{stats.confirmed_bookings || 0} Confirmed</span>
            </div>
          </div>
        </div>

        <div className="stat-card-mobile revenue">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">💰</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{formatCurrency(stats.total_revenue || 0)}</h3>
            <p>Total Revenue</p>
            <div className="stat-breakdown-mobile">
              <span>From completed trips</span>
            </div>
          </div>
        </div>

        <div className="stat-card-mobile ratings">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">⭐</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : 'N/A'}</h3>
            <p>Average Rating</p>
            <div className="stat-breakdown-mobile">
              <span>{stats.total_ratings || 0} Reviews</span>
            </div>
          </div>
        </div>

        <div className="stat-card-mobile vehicles">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">🚗</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{stats.total_vehicles || 0}</h3>
            <p>Total Vehicles</p>
            <div className="stat-breakdown-mobile">
              <span>Registered</span>
            </div>
          </div>
        </div>

        <div className="stat-card-mobile activity">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">📊</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{stats.activities_24h || 0}</h3>
            <p>Activities (24h)</p>
            <div className="stat-breakdown-mobile">
              <span>{stats.activities_7d || 0} This Week</span>
            </div>
          </div>
        </div>

        <div className="stat-card-mobile ips">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">🌐</div>
          </div>
          <div className="stat-info-mobile">
            <h3>{stats.unique_ips || 0}</h3>
            <p>Unique IPs</p>
            <div className="stat-breakdown-mobile">
              <span>Last 7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section-mobile">
        <h2>Quick Actions</h2>
        <div className="actions-grid-mobile">
          <Link to="/admin/vehicles" className="action-card-mobile">
            <div className="action-icon">🚗</div>
            <h3>Manage Vehicles</h3>
          </Link>
          <Link to="/admin/drivers" className="action-card-mobile">
            <div className="action-icon">👨‍✈️</div>
            <h3>Manage Drivers</h3>
          </Link>
          <Link to="/admin/passengers" className="action-card-mobile">
            <div className="action-icon">👤</div>
            <h3>Manage Passengers</h3>
          </Link>
          <Link to="/admin/trips" className="action-card-mobile">
            <div className="action-icon">📅</div>
            <h3>Manage Trips</h3>
          </Link>
          <Link to="/admin/departures" className="action-card-mobile">
            <div className="action-icon">✈️</div>
            <h3>Departures</h3>
          </Link>
        </div>
      </div>

      {/* Top Active Users */}
      {topUsers.length > 0 && (
        <div className="analytics-section-mobile">
          <h2>📈 Top Active Users (7 Days)</h2>
          <div className="analytics-card-mobile">
            <div className="users-list-mobile">
              {topUsers.map((userItem, idx) => (
                <div key={userItem.id || idx} className="user-item-mobile">
                  <div className="user-rank">#{idx + 1}</div>
                  <div className="user-info-mobile">
                    <div className="user-name-mobile">
                      {userItem.full_name || userItem.username}
                      <span className="user-role-badge">{userItem.role}</span>
                    </div>
                    <div className="user-stats-mobile">
                      <span>📊 {userItem.activity_count} activities</span>
                      <span>🌐 {userItem.unique_ips} IPs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IP Address Statistics */}
      {ipStats.length > 0 && (
        <div className="analytics-section-mobile">
          <h2>🌐 IP Address Statistics</h2>
          <div className="analytics-card-mobile">
            <div className="ip-list-mobile">
              {ipStats.map((ipItem, idx) => (
                <div key={idx} className="ip-item-mobile">
                  <div className="ip-address-mobile">
                    <span className="ip-icon">🔗</span>
                    {ipItem.ip_address}
                  </div>
                  <div className="ip-stats-mobile">
                    <span>📊 {ipItem.request_count} requests</span>
                    <span>👥 {ipItem.unique_users} users</span>
                    <span>🕐 {formatDate(ipItem.last_seen)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activities */}
      <div className="analytics-section-mobile">
        <h2>📝 Recent Activities</h2>
        <div className="analytics-card-mobile">
          <div className="activity-list-mobile">
            {recentActivities.length > 0 ? (
              recentActivities.map(activity => (
                <div key={activity.id} className="activity-item-mobile">
                  <div className="activity-icon-mobile">
                    {getActivityIcon(activity.action_type)}
                  </div>
                  <div className="activity-content-mobile">
                    <div className="activity-header-mobile">
                      <p className="activity-title-mobile">{activity.action_type?.replace(/_/g, ' ')}</p>
                      {activity.ip_address && (
                        <span className="activity-ip">🌐 {activity.ip_address}</span>
                      )}
                    </div>
                    <p className="activity-details-mobile">
                      {activity.username ? `${activity.username} (${activity.role})` : 'System'}
                    </p>
                    <span className="activity-time-mobile">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-activity-mobile">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
