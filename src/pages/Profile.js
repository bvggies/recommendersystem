import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    fare_range_min: '',
    fare_range_max: '',
    preferred_routes: []
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

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

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>My Profile</h1>
        {message && <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}
        
        {!editing ? (
          <div className="profile-view">
            <div className="profile-info">
              <p><strong>Username:</strong> {profile?.username}</p>
              <p><strong>Email:</strong> {profile?.email}</p>
              <p><strong>Full Name:</strong> {profile?.full_name || 'Not set'}</p>
              <p><strong>Phone:</strong> {profile?.phone || 'Not set'}</p>
              <p><strong>Role:</strong> {profile?.role}</p>
              <p><strong>Fare Range:</strong> ₵{profile?.fare_range_min || 0} - ₵{profile?.fare_range_max || 1000}</p>
              {profile?.preferred_routes && profile.preferred_routes.length > 0 && (
                <p><strong>Preferred Routes:</strong> {profile.preferred_routes.join(', ')}</p>
              )}
            </div>
            <button onClick={() => setEditing(true)} className="edit-btn">Edit Profile</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Min Fare (₵)</label>
              <input
                type="number"
                name="fare_range_min"
                value={formData.fare_range_min}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Max Fare (₵)</label>
              <input
                type="number"
                name="fare_range_max"
                value={formData.fare_range_max}
                onChange={handleChange}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn">Save Changes</button>
              <button type="button" onClick={() => setEditing(false)} className="cancel-btn">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;

