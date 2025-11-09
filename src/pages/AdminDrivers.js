import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminUsers.css';

const AdminDrivers = () => {
  const { user, loading: authLoading } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    full_name: '',
    role: 'driver'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?role=driver');
      setDrivers(res.data.users || []);
    } catch (error) {
      console.error('Failed to load drivers:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const status = error.response?.status;
      console.log('Error details:', {
        status,
        error: errorMsg,
        userRole: user?.role,
        hasToken: !!localStorage.getItem('token')
      });
      setError(`Failed to load drivers (${status || 'Network Error'}): ${errorMsg}. Your role: ${user?.role || 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadDrivers();
    }
  }, [authLoading, user, loadDrivers]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.email || (!editingDriver && !formData.password)) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingDriver) {
        await api.put(`/users/${editingDriver.id}`, formData);
        setSuccess('Driver updated successfully!');
      } else {
        await api.post('/users', formData);
        setSuccess('Driver added successfully!');
      }
      setShowForm(false);
      setEditingDriver(null);
      setFormData({
        username: '',
        email: '',
        phone: '',
        password: '',
        full_name: '',
        role: 'driver'
      });
      loadDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save driver');
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      username: driver.username,
      email: driver.email,
      phone: driver.phone || '',
      password: '',
      full_name: driver.full_name || '',
      role: 'driver'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      setSuccess('Driver deleted successfully!');
      loadDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete driver');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDriver(null);
    setFormData({
      username: '',
      email: '',
      phone: '',
      password: '',
      full_name: '',
      role: 'driver'
    });
  };

  if (authLoading || loading) {
    return <div className="admin-loading">Loading drivers...</div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-loading">
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>👨‍✈️ Manage Drivers</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          ➕ Add New Driver
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-content">
            <h2>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
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
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>{editingDriver ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingDriver}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingDriver ? 'Update' : 'Add'} Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length > 0 ? (
              drivers.map(driver => (
                <tr key={driver.id}>
                  <td><strong>{driver.username}</strong></td>
                  <td>{driver.full_name || 'N/A'}</td>
                  <td>{driver.email}</td>
                  <td>{driver.phone || 'N/A'}</td>
                  <td>{new Date(driver.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEdit(driver)} className="btn-edit">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(driver.id)} className="btn-delete">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">No drivers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDrivers;

