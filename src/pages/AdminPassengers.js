import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminUsers.css';

const AdminPassengers = () => {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    full_name: '',
    role: 'passenger'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPassengers();
  }, []);

  const loadPassengers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?role=passenger');
      setPassengers(res.data.users || []);
    } catch (error) {
      console.error('Failed to load passengers:', error);
      setError('Failed to load passengers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.email || (!editingPassenger && !formData.password)) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingPassenger) {
        await api.put(`/users/${editingPassenger.id}`, formData);
        setSuccess('Passenger updated successfully!');
      } else {
        await api.post('/users', formData);
        setSuccess('Passenger added successfully!');
      }
      setShowForm(false);
      setEditingPassenger(null);
      setFormData({
        username: '',
        email: '',
        phone: '',
        password: '',
        full_name: '',
        role: 'passenger'
      });
      loadPassengers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save passenger');
    }
  };

  const handleEdit = (passenger) => {
    setEditingPassenger(passenger);
    setFormData({
      username: passenger.username,
      email: passenger.email,
      phone: passenger.phone || '',
      password: '',
      full_name: passenger.full_name || '',
      role: 'passenger'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this passenger?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      setSuccess('Passenger deleted successfully!');
      loadPassengers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete passenger');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPassenger(null);
    setFormData({
      username: '',
      email: '',
      phone: '',
      password: '',
      full_name: '',
      role: 'passenger'
    });
  };

  if (loading) {
    return <div className="admin-loading">Loading passengers...</div>;
  }

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>👤 Manage Passengers</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          ➕ Add New Passenger
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-content">
            <h2>{editingPassenger ? 'Edit Passenger' : 'Add New Passenger'}</h2>
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
                <label>{editingPassenger ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingPassenger}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingPassenger ? 'Update' : 'Add'} Passenger
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
            {passengers.length > 0 ? (
              passengers.map(passenger => (
                <tr key={passenger.id}>
                  <td><strong>{passenger.username}</strong></td>
                  <td>{passenger.full_name || 'N/A'}</td>
                  <td>{passenger.email}</td>
                  <td>{passenger.phone || 'N/A'}</td>
                  <td>{new Date(passenger.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEdit(passenger)} className="btn-edit">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(passenger.id)} className="btn-delete">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">No passengers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPassengers;

