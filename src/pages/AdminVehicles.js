import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminVehicles.css';

const AdminVehicles = () => {
  const { user, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    driver_id: '',
    vehicle_type: 'bus',
    registration_number: '',
    comfort_level: 'standard',
    capacity: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/users?role=driver')
      ]);
      setVehicles(vehiclesRes.data.vehicles || []);
      setDrivers(driversRes.data.users || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const status = error.response?.status;
      console.log('Error details:', {
        status,
        error: errorMsg,
        userRole: user?.role,
        hasToken: !!localStorage.getItem('token')
      });
      setError(`Failed to load vehicles (${status || 'Network Error'}): ${errorMsg}. Your role: ${user?.role || 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadData();
    }
  }, [authLoading, user, loadData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.registration_number || !formData.capacity) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, formData);
        setSuccess('Vehicle updated successfully!');
      } else {
        await api.post('/vehicles', formData);
        setSuccess('Vehicle added successfully!');
      }
      setShowForm(false);
      setEditingVehicle(null);
      setFormData({
        driver_id: '',
        vehicle_type: 'bus',
        registration_number: '',
        comfort_level: 'standard',
        capacity: ''
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      driver_id: vehicle.driver_id || '',
      vehicle_type: vehicle.vehicle_type || 'bus',
      registration_number: vehicle.registration_number || '',
      comfort_level: vehicle.comfort_level || 'standard',
      capacity: vehicle.capacity || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      await api.delete(`/vehicles/${id}`);
      setSuccess('Vehicle deleted successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete vehicle');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVehicle(null);
    setFormData({
      driver_id: '',
      vehicle_type: 'bus',
      registration_number: '',
      comfort_level: 'standard',
      capacity: ''
    });
  };

  if (authLoading || loading) {
    return <div className="admin-loading">Loading vehicles...</div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-loading">
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="admin-vehicles">
      <div className="page-header">
        <h1>🚗 Manage Vehicles</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          ➕ Add New Vehicle
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-content">
            <h2>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Driver (Optional)</label>
                <select
                  name="driver_id"
                  value={formData.driver_id}
                  onChange={handleChange}
                >
                  <option value="">No driver assigned</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name || driver.username} ({driver.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Vehicle Type *</label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  required
                >
                  <option value="bus">Bus</option>
                  <option value="minibus">Minibus</option>
                  <option value="taxi">Taxi</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div className="form-group">
                <label>Registration Number *</label>
                <input
                  type="text"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  required
                  placeholder="e.g., GR-1234-21"
                />
              </div>

              <div className="form-group">
                <label>Comfort Level *</label>
                <select
                  name="comfort_level"
                  value={formData.comfort_level}
                  onChange={handleChange}
                  required
                >
                  <option value="standard">Standard</option>
                  <option value="VIP">VIP</option>
                  <option value="air-conditioned">Air-Conditioned</option>
                </select>
              </div>

              <div className="form-group">
                <label>Capacity (Seats) *</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="e.g., 15"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingVehicle ? 'Update' : 'Add'} Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="vehicles-table">
        <table>
          <thead>
            <tr>
              <th>Registration</th>
              <th>Type</th>
              <th>Comfort</th>
              <th>Capacity</th>
              <th>Driver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length > 0 ? (
              vehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  <td><strong>{vehicle.registration_number}</strong></td>
                  <td>{vehicle.vehicle_type}</td>
                  <td>{vehicle.comfort_level}</td>
                  <td>{vehicle.capacity} seats</td>
                  <td>{vehicle.driver_name || 'No driver'}</td>
                  <td>
                    <button onClick={() => handleEdit(vehicle)} className="btn-edit">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(vehicle.id)} className="btn-delete">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">No vehicles found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminVehicles;

