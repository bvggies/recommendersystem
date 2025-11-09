import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tripService } from '../services/tripService';
import api from '../services/api';
import './DriverDashboard.css';

const DriverDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    totalBookings: 0,
    totalRevenue: 0,
    avgRating: 0
  });
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load driver's trips
      const tripsRes = await tripService.getMyTrips();
      const trips = tripsRes.trips || [];

      const active = trips.filter(t => t.status === 'scheduled' && new Date(t.departure_time) > new Date());
      const upcoming = trips
        .filter(t => t.status === 'scheduled' && new Date(t.departure_time) > new Date())
        .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time))
        .slice(0, 5);

      // Calculate revenue (sum of fare * bookings)
      let revenue = 0;
      trips.forEach(trip => {
        if (trip.bookings_count) {
          revenue += parseFloat(trip.fare || 0) * parseInt(trip.bookings_count || 0);
        }
      });

      setUpcomingTrips(upcoming);
      setRecentTrips(trips.slice(0, 5));
      
      setStats({
        totalTrips: trips.length,
        activeTrips: active.length,
        totalBookings: trips.reduce((sum, t) => sum + parseInt(t.bookings_count || 0), 0),
        totalRevenue: revenue,
        avgRating: 0 // Will be calculated from ratings
      });

      // Load notifications
      try {
        const notifRes = await api.get('/notifications?unread_only=true');
        setNotifications(notifRes.data.notifications?.slice(0, 5) || []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await tripService.deleteTrip(tripId);
        loadDashboardData();
      } catch (error) {
        alert('Failed to delete trip');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome, {user?.full_name || user?.username}!</h1>
            <p>Manage your trips and bookings</p>
          </div>
          <div className="profile-avatar">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {(user?.full_name || user?.username || 'D').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>₵{stats.totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="stat-card trips">
          <div className="stat-icon">🚌</div>
          <div className="stat-info">
            <h3>{stats.totalTrips}</h3>
            <p>Total Trips</p>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{stats.activeTrips}</h3>
            <p>Active Trips</p>
          </div>
        </div>
        <div className="stat-card bookings">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalBookings}</h3>
            <p>Total Bookings</p>
          </div>
        </div>
        <div className="stat-card rating">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <h3>{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}</h3>
            <p>Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/trips/create" className="action-card primary">
            <div className="action-icon">➕</div>
            <span>Create Trip</span>
          </Link>
          <Link to="/trips/my-trips" className="action-card">
            <div className="action-icon">📋</div>
            <span>My Trips</span>
          </Link>
          <Link to="/profile" className="action-card">
            <div className="action-icon">👤</div>
            <span>Profile</span>
          </Link>
          <button onClick={() => loadDashboardData()} className="action-card">
            <div className="action-icon">🔄</div>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Left Column */}
        <div className="content-left">
          {/* Upcoming Trips */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>📅 Upcoming Trips</h2>
              <Link to="/trips/my-trips" className="view-all">View All</Link>
            </div>
            {upcomingTrips.length > 0 ? (
              <div className="trips-list">
                {upcomingTrips.map(trip => (
                  <div key={trip.id} className="trip-card-mini">
                    <div className="trip-route">
                      <span className="route-from">{trip.origin}</span>
                      <span className="route-arrow">→</span>
                      <span className="route-to">{trip.destination}</span>
                    </div>
                    <div className="trip-details-mini">
                      <span className="trip-date">{formatDate(trip.departure_time)}</span>
                      <span className="trip-time">{formatTime(trip.departure_time)}</span>
                      <span className="trip-fare">₵{trip.fare}</span>
                      <span className="trip-seats">{trip.available_seats}/{trip.total_seats} seats</span>
                    </div>
                    <div className="trip-actions">
                      <span className={`trip-status-badge ${trip.status}`}>
                        {trip.status}
                      </span>
                      {trip.bookings_count > 0 && (
                        <span className="bookings-badge">{trip.bookings_count} bookings</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No upcoming trips</p>
                <Link to="/trips/create" className="btn-primary">Create Your First Trip</Link>
              </div>
            )}
          </div>

          {/* Recent Trips */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>📊 Recent Trips</h2>
            </div>
            {recentTrips.length > 0 ? (
              <div className="trips-list">
                {recentTrips.map(trip => (
                  <div key={trip.id} className="trip-card-mini">
                    <div className="trip-route">
                      <span className="route-from">{trip.origin}</span>
                      <span className="route-arrow">→</span>
                      <span className="route-to">{trip.destination}</span>
                    </div>
                    <div className="trip-details-mini">
                      <span>{formatDate(trip.departure_time)}</span>
                      <span>₵{trip.fare}</span>
                      <span>{trip.bookings_count || 0} bookings</span>
                    </div>
                    <div className="trip-actions">
                      <span className={`trip-status-badge ${trip.status}`}>
                        {trip.status}
                      </span>
                      <button 
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="delete-btn"
                        title="Delete trip"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No trips yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="content-right">
          {/* Notifications */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>🔔 Notifications</h2>
              <Link to="/notifications" className="view-all">All</Link>
            </div>
            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map(notif => (
                  <div key={notif.id} className={`notification-item ${!notif.is_read ? 'unread' : ''}`}>
                    <div className="notification-content">
                      <h4>{notif.title}</h4>
                      <p>{notif.message}</p>
                      <span className="notification-time">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No new notifications</p>
              </div>
            )}
          </div>

          {/* Performance Summary */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>📈 Performance</h2>
            </div>
            <div className="performance-stats">
              <div className="perf-item">
                <span className="perf-label">Completion Rate</span>
                <span className="perf-value">
                  {stats.totalTrips > 0 
                    ? Math.round((stats.totalTrips - stats.activeTrips) / stats.totalTrips * 100)
                    : 0}%
                </span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Avg Bookings/Trip</span>
                <span className="perf-value">
                  {stats.totalTrips > 0 
                    ? (stats.totalBookings / stats.totalTrips).toFixed(1)
                    : 0}
                </span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Avg Revenue/Trip</span>
                <span className="perf-value">
                  ₵{stats.totalTrips > 0 
                    ? (stats.totalRevenue / stats.totalTrips).toFixed(2)
                    : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="dashboard-section tips-section">
            <div className="section-header">
              <h2>💡 Tips</h2>
            </div>
            <div className="tips-list">
              <div className="tip-item">
                <span className="tip-icon">📅</span>
                <p>Create trips in advance for better bookings</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">💰</span>
                <p>Competitive pricing increases bookings</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">⭐</span>
                <p>Maintain good ratings for more passengers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;

