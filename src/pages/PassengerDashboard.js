import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import { recommendationService } from '../services/recommendationService';
import api from '../services/api';
import './PassengerDashboard.css';

const PassengerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingTrips: 0,
    completedTrips: 0,
    savedRoutes: 0
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load bookings
      const bookingsRes = await bookingService.getMyBookings();
      const bookings = bookingsRes.bookings || [];
      
      const upcoming = bookings.filter(b => 
        b.booking_status === 'confirmed' && 
        new Date(b.departure_time) > new Date()
      );
      const completed = bookings.filter(b => 
        b.booking_status === 'completed' || 
        b.trip_status === 'completed'
      );

      setUpcomingBookings(upcoming.slice(0, 3));
      setStats({
        totalBookings: bookings.length,
        upcomingTrips: upcoming.length,
        completedTrips: completed.length,
        savedRoutes: 0
      });

      // Load recommendations
      const recRes = await recommendationService.getRecommendations();
      setRecommendations(recRes.recommendations?.slice(0, 4) || []);

      // Load popular routes
      const routesRes = await api.get('/routes/popular');
      setPopularRoutes(routesRes.data.routes?.slice(0, 4) || []);

      // Load notifications
      const notifRes = await api.get('/notifications?unread_only=true');
      setNotifications(notifRes.data.notifications?.slice(0, 5) || []);

      // Recent activity
      setRecentActivity(bookings.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/trips?destination=${encodeURIComponent(searchQuery)}`);
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
    <div className="passenger-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome back, {user?.full_name || user?.username}!</h1>
            <p>Find your perfect trip today</p>
          </div>
          <div className="profile-avatar">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Quick Search */}
        <div className="quick-search">
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="search-btn">
            <span className="search-icon">🔍</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{stats.totalBookings}</h3>
            <p>Total Bookings</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚌</div>
          <div className="stat-info">
            <h3>{stats.upcomingTrips}</h3>
            <p>Upcoming Trips</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.completedTrips}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <h3>{stats.savedRoutes}</h3>
            <p>Saved Routes</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/trips" className="action-card">
            <div className="action-icon">🔍</div>
            <span>Find Trips</span>
          </Link>
          <Link to="/recommendations" className="action-card">
            <div className="action-icon">✨</div>
            <span>AI Recommendations</span>
          </Link>
          <Link to="/bookings" className="action-card">
            <div className="action-icon">📋</div>
            <span>My Bookings</span>
          </Link>
          <Link to="/profile" className="action-card">
            <div className="action-icon">👤</div>
            <span>Profile</span>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Left Column */}
        <div className="content-left">
          {/* Upcoming Trips */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Upcoming Trips</h2>
              <Link to="/bookings" className="view-all">View All</Link>
            </div>
            {upcomingBookings.length > 0 ? (
              <div className="trips-list">
                {upcomingBookings.map(booking => (
                  <div key={booking.id} className="trip-card-mini">
                    <div className="trip-route">
                      <span className="route-from">{booking.origin}</span>
                      <span className="route-arrow">→</span>
                      <span className="route-to">{booking.destination}</span>
                    </div>
                    <div className="trip-details-mini">
                      <span className="trip-date">{formatDate(booking.departure_time)}</span>
                      <span className="trip-time">{formatTime(booking.departure_time)}</span>
                      <span className="trip-fare">₵{booking.fare}</span>
                    </div>
                    <div className="trip-status-badge confirmed">
                      {booking.booking_status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No upcoming trips</p>
                <Link to="/trips" className="btn-primary">Book a Trip</Link>
              </div>
            )}
          </div>

          {/* AI Recommendations */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>✨ AI Recommendations</h2>
              <Link to="/recommendations" className="view-all">See More</Link>
            </div>
            {recommendations.length > 0 ? (
              <div className="recommendations-grid">
                {recommendations.map(trip => (
                  <div key={trip.id} className="recommendation-card-mini">
                    <div className="rec-header">
                      <h4>{trip.origin} → {trip.destination}</h4>
                      <span className="rec-badge">Recommended</span>
                    </div>
                    <div className="rec-details">
                      <span>₵{trip.fare}</span>
                      <span>{formatDate(trip.departure_time)}</span>
                      {trip.avg_rating > 0 && (
                        <span>⭐ {parseFloat(trip.avg_rating).toFixed(1)}</span>
                      )}
                    </div>
                    <Link to={`/trips/${trip.id}`} className="rec-link">View Details</Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recommendations available</p>
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

          {/* Popular Routes */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>🔥 Popular Routes</h2>
            </div>
            {popularRoutes.length > 0 ? (
              <div className="routes-list">
                {popularRoutes.map(route => (
                  <Link 
                    key={route.id} 
                    to={`/trips?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`}
                    className="route-item"
                  >
                    <div className="route-info">
                      <span className="route-path">{route.origin} → {route.destination}</span>
                      <span className="route-stats">
                        {route.trip_count || 0} trips • ₵{parseFloat(route.avg_fare || 0).toFixed(0)}
                      </span>
                    </div>
                    <span className="route-arrow">→</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No popular routes</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>📊 Recent Activity</h2>
            </div>
            {recentActivity.length > 0 ? (
              <div className="activity-list">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {activity.booking_status === 'confirmed' ? '✅' : '📋'}
                    </div>
                    <div className="activity-content">
                      <p>Booked trip to {activity.destination}</p>
                      <span>{formatDate(activity.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassengerDashboard;

