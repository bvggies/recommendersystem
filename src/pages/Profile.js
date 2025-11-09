import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, stats, settings
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    fare_range_min: '',
    fare_range_max: '',
    preferred_routes: []
  });
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedTrips: 0,
    totalSpent: 0,
    avgRating: 0
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
    if (user?.role === 'passenger' || user?.role === 'driver') {
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setProfile(response.data.user);
      setFormData({
        full_name: response.data.user.full_name || '',
        phone: response.data.user.phone || '',
        fare_range_min: response.data.user.fare_range_min || '',
        fare_range_max: response.data.user.fare_range_max || '',
        preferred_routes: response.data.user.preferred_routes || []
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (user?.role === 'passenger') {
        const bookingsRes = await api.get('/bookings/my-bookings');
        const bookings = bookingsRes.data.bookings || [];
        const completed = bookings.filter(b => b.booking_status === 'completed');
        const totalSpent = completed.reduce((sum, b) => sum + parseFloat(b.fare || 0), 0);
        setStats({
          totalBookings: bookings.length,
          completedTrips: completed.length,
          totalSpent: totalSpent,
          avgRating: 0
        });
      } else if (user?.role === 'driver') {
        const tripsRes = await api.get('/trips/driver/my-trips');
        const trips = tripsRes.data.trips || [];
        const completed = trips.filter(t => t.status === 'completed');
        const revenue = completed.reduce((sum, t) => {
          const bookings = parseInt(t.bookings_count || 0);
          return sum + (parseFloat(t.fare || 0) * bookings);
        }, 0);
        setStats({
          totalBookings: trips.reduce((sum, t) => sum + parseInt(t.bookings_count || 0), 0),
          completedTrips: completed.length,
          totalSpent: revenue,
          avgRating: 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/users/profile', formData);
      setMessage('Profile updated successfully!');
      setEditing(false);
      loadProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👨‍💼';
      case 'driver': return '🚗';
      case 'passenger': return '👤';
      default: return '👤';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#1e3c72';
      case 'driver': return '#f39c12';
      case 'passenger': return '#27ae60';
      default: return '#667eea';
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page-mobile">
      {/* Header Section */}
      <div className="profile-header" style={{ background: `linear-gradient(135deg, ${getRoleColor(user?.role)} 0%, ${getRoleColor(user?.role)}dd 100%)` }}>
        <div className="profile-avatar">
          <div className="avatar-circle">
            {profile?.profile_picture ? (
              <img src={profile.profile_picture} alt={profile.full_name} />
            ) : (
              <span className="avatar-icon">{getRoleIcon(user?.role)}</span>
            )}
          </div>
          <button className="edit-avatar-btn" onClick={() => setEditing(true)}>
            ✏️
          </button>
        </div>
        <div className="profile-header-info">
          <h1>{profile?.full_name || profile?.username || 'User'}</h1>
          <p className="profile-role">{user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}</p>
          <p className="profile-email">{profile?.email}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Overview
        </button>
        {(user?.role === 'passenger' || user?.role === 'driver') && (
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Stats
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="profile-content">
        {message && (
          <div className={`profile-message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="profile-overview">
            <div className="info-card">
              <div className="info-item">
                <span className="info-icon">👤</span>
                <div className="info-content">
                  <label>Username</label>
                  <p>{profile?.username}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">✉️</span>
                <div className="info-content">
                  <label>Email</label>
                  <p>{profile?.email}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">📞</span>
                <div className="info-content">
                  <label>Phone</label>
                  <p>{profile?.phone || 'Not set'}</p>
                </div>
              </div>
              <div className="info-item">
                <span className="info-icon">📅</span>
                <div className="info-content">
                  <label>Member Since</label>
                  <p>{new Date(profile?.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {user?.role === 'passenger' && (
                <>
                  <div className="info-item">
                    <span className="info-icon">💰</span>
                    <div className="info-content">
                      <label>Fare Range</label>
                      <p>₵{profile?.fare_range_min || 0} - ₵{profile?.fare_range_max || 1000}</p>
                    </div>
                  </div>
                  {profile?.preferred_routes && profile.preferred_routes.length > 0 && (
                    <div className="info-item">
                      <span className="info-icon">🗺️</span>
                      <div className="info-content">
                        <label>Preferred Routes</label>
                        <div className="routes-tags">
                          {profile.preferred_routes.map((route, idx) => (
                            <span key={idx} className="route-tag">{route}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (user?.role === 'passenger' || user?.role === 'driver') && (
          <div className="profile-stats">
            <div className="stats-grid-mobile">
              <div className="stat-card-mobile">
                <div className="stat-icon-mobile">📋</div>
                <div className="stat-value">{stats.totalBookings}</div>
                <div className="stat-label">{user?.role === 'passenger' ? 'Total Bookings' : 'Total Trips'}</div>
              </div>
              <div className="stat-card-mobile">
                <div className="stat-icon-mobile">✅</div>
                <div className="stat-value">{stats.completedTrips}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card-mobile">
                <div className="stat-icon-mobile">{user?.role === 'passenger' ? '💰' : '💵'}</div>
                <div className="stat-value">₵{stats.totalSpent.toFixed(2)}</div>
                <div className="stat-label">{user?.role === 'passenger' ? 'Total Spent' : 'Total Revenue'}</div>
              </div>
              <div className="stat-card-mobile">
                <div className="stat-icon-mobile">⭐</div>
                <div className="stat-value">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}</div>
                <div className="stat-label">Avg Rating</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="profile-settings">
            {!editing ? (
              <div className="settings-view">
                <button onClick={() => setEditing(true)} className="edit-profile-btn">
                  ✏️ Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="profile-form-mobile">
                <div className="form-group-mobile">
                  <label>
                    <span className="form-icon">👤</span> Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group-mobile">
                  <label>
                    <span className="form-icon">📞</span> Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+233 24 123 4567"
                  />
                </div>
                {user?.role === 'passenger' && (
                  <>
                    <div className="form-group-mobile">
                      <label>
                        <span className="form-icon">💰</span> Min Fare (₵)
                      </label>
                      <input
                        type="number"
                        name="fare_range_min"
                        value={formData.fare_range_min}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group-mobile">
                      <label>
                        <span className="form-icon">💰</span> Max Fare (₵)
                      </label>
                      <input
                        type="number"
                        name="fare_range_max"
                        value={formData.fare_range_max}
                        onChange={handleChange}
                        placeholder="1000"
                      />
                    </div>
                  </>
                )}
                <div className="form-actions-mobile">
                  <button type="submit" className="save-btn-mobile">
                    💾 Save Changes
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="cancel-btn-mobile">
                    ❌ Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
