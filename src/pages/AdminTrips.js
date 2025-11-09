import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { tripService } from '../services/tripService';
import './AdminTrips.css';

const AdminTrips = () => {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [formData, setFormData] = useState({
    driver_id: '',
    vehicle_id: '',
    origin: 'Nkawkaw',
    destination: '',
    fare: '',
    departure_date: '',
    departure_time: '',
    total_seats: '',
    status: 'scheduled'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadData();
    }
  }, [authLoading, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // For admin, get all trips by passing status=all or empty status
      const [tripsRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/trips?status=all'), // Get all trips for admin
        api.get('/users?role=driver'),
        api.get('/vehicles')
      ]);
      setTrips(tripsRes.data.trips || []);
      setDrivers(driversRes.data.users || []);
      setVehicles(vehiclesRes.data.vehicles || []);
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
      setError(`Failed to load data (${status || 'Network Error'}): ${errorMsg}. Your role: ${user?.role || 'unknown'}`);
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

    if (!formData.driver_id || !formData.destination || !formData.fare || 
        !formData.departure_date || !formData.departure_time || !formData.total_seats) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const departureDateTime = `${formData.departure_date}T${formData.departure_time}:00`;
      const tripData = {
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id || null,
        origin: formData.origin,
        destination: formData.destination,
        fare: parseFloat(formData.fare),
        departure_time: departureDateTime,
        total_seats: parseInt(formData.total_seats),
        status: formData.status
      };

      if (editingTrip) {
        await tripService.updateTrip(editingTrip.id, tripData);
        setSuccess('Trip updated successfully!');
      } else {
        await tripService.createTrip(tripData);
        setSuccess('Trip created successfully!');
      }
      setShowForm(false);
      setEditingTrip(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save trip');
    }
  };

  const resetForm = () => {
    setFormData({
      driver_id: '',
      vehicle_id: '',
      origin: 'Nkawkaw',
      destination: '',
      fare: '',
      departure_date: '',
      departure_time: '',
      total_seats: '',
      status: 'scheduled'
    });
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    const departure = new Date(trip.departure_time);
    setFormData({
      driver_id: trip.driver_id || '',
      vehicle_id: trip.vehicle_id || '',
      origin: trip.origin || 'Nkawkaw',
      destination: trip.destination || '',
      fare: trip.fare || '',
      departure_date: departure.toISOString().split('T')[0],
      departure_time: departure.toTimeString().slice(0, 5),
      total_seats: trip.total_seats || '',
      status: trip.status || 'scheduled'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      await tripService.deleteTrip(id);
      setSuccess('Trip deleted successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete trip');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTrip(null);
    resetForm();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (authLoading || loading) {
    return <div className="admin-loading">Loading trips...</div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-loading">
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="admin-trips">
      <div className="page-header">
        <h1>📅 Manage Trips</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          ➕ Add New Trip
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-content">
            <h2>{editingTrip ? 'Edit Trip' : 'Add New Trip'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Driver *</label>
                <select
                  name="driver_id"
                  value={formData.driver_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name || driver.username} ({driver.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Vehicle (Optional)</label>
                <select
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleChange}
                >
                  <option value="">No vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} - {vehicle.vehicle_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Origin *</label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Destination *</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fare (₵) *</label>
                  <input
                    type="number"
                    name="fare"
                    value={formData.fare}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Total Seats *</label>
                  <input
                    type="number"
                    name="total_seats"
                    value={formData.total_seats}
                    onChange={handleChange}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Departure Date *</label>
                  <input
                    type="date"
                    name="departure_date"
                    value={formData.departure_date}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>Departure Time *</label>
                  <input
                    type="time"
                    name="departure_time"
                    value={formData.departure_time}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingTrip ? 'Update' : 'Create'} Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="trips-table">
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Departure</th>
              <th>Fare</th>
              <th>Seats</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.length > 0 ? (
              trips.map(trip => (
                <tr key={trip.id}>
                  <td>
                    <strong>{trip.origin} → {trip.destination}</strong>
                  </td>
                  <td>{trip.driver_name || 'N/A'}</td>
                  <td>{trip.registration_number || 'N/A'}</td>
                  <td>{formatDateTime(trip.departure_time)}</td>
                  <td>₵{parseFloat(trip.fare).toFixed(2)}</td>
                  <td>{trip.available_seats}/{trip.total_seats}</td>
                  <td>
                    <span className={`status-badge ${trip.status}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleEdit(trip)} className="btn-edit">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(trip.id)} className="btn-delete">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">No trips found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTrips;

