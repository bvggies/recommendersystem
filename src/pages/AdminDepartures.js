import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { tripService } from '../services/tripService';
import './AdminDepartures.css';

const AdminDepartures = () => {
  const { user, loading: authLoading } = useAuth();
  const [departures, setDepartures] = useState([]);
  const [arrivals, setArrivals] = useState([]);
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
    status: 'scheduled',
    trip_type: 'departure' // departure or arrival
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [departuresRes, arrivalsRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/trips?origin=Nkawkaw&status=scheduled'),
        api.get('/trips?destination=Nkawkaw&status=scheduled'),
        api.get('/users?role=driver'),
        api.get('/vehicles')
      ]);
      
      setDepartures(departuresRes.data.trips || []);
      setArrivals(arrivalsRes.data.trips || []);
      setDrivers(driversRes.data.users || []);
      setVehicles(vehiclesRes.data.vehicles || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(`Failed to load data: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

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

    // Set origin/destination based on trip type
    const finalOrigin = formData.trip_type === 'departure' ? 'Nkawkaw' : formData.destination;
    const finalDestination = formData.trip_type === 'departure' ? formData.destination : 'Nkawkaw';

    if (!formData.driver_id || !finalDestination || !formData.fare || 
        !formData.departure_date || !formData.departure_time || !formData.total_seats) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const departureDateTime = `${formData.departure_date}T${formData.departure_time}:00`;
      const tripData = {
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id || null,
        origin: finalOrigin,
        destination: finalDestination,
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
      status: 'scheduled',
      trip_type: 'departure'
    });
  };

  const handleEdit = (trip, type) => {
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
      status: trip.status || 'scheduled',
      trip_type: type
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
    return <div className="admin-loading">Loading departures and arrivals...</div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-loading">
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="admin-departures">
      <div className="page-header">
        <h1>✈️ Manage Departures & Arrivals</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          ➕ Add New Trip
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-content">
            <h2>{editingTrip ? 'Edit Trip' : 'Add New Departure/Arrival'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Trip Type *</label>
                <select
                  name="trip_type"
                  value={formData.trip_type}
                  onChange={handleChange}
                  required
                >
                  <option value="departure">✈️ Departure (From Nkawkaw)</option>
                  <option value="arrival">🏁 Arrival (To Nkawkaw)</option>
                </select>
              </div>

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
                  <label>{formData.trip_type === 'departure' ? 'Destination *' : 'Origin *'}</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                    placeholder={formData.trip_type === 'departure' ? 'e.g., Accra' : 'e.g., Accra'}
                  />
                </div>
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
              </div>

              <div className="form-row">
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

      <div className="departures-arrivals-grid">
        {/* Departures Section */}
        <div className="section-card">
          <div className="section-header">
            <h2>✈️ Departures</h2>
            <span className="count-badge">{departures.length}</span>
          </div>
          <div className="trips-list">
            {departures.length > 0 ? (
              departures.map(trip => (
                <div key={trip.id} className="trip-item">
                  <div className="trip-info">
                    <div className="trip-route">
                      <strong>{trip.origin} → {trip.destination}</strong>
                    </div>
                    <div className="trip-details">
                      <span>🚗 {trip.registration_number || 'N/A'}</span>
                      <span>👤 {trip.driver_name || 'N/A'}</span>
                      <span>⏰ {formatDateTime(trip.departure_time)}</span>
                      <span>💰 ₵{parseFloat(trip.fare).toFixed(2)}</span>
                      <span>💺 {trip.available_seats}/{trip.total_seats}</span>
                    </div>
                  </div>
                  <div className="trip-actions">
                    <button onClick={() => handleEdit(trip, 'departure')} className="btn-edit">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(trip.id)} className="btn-delete">
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No departures scheduled</p>
            )}
          </div>
        </div>

        {/* Arrivals Section */}
        <div className="section-card">
          <div className="section-header">
            <h2>🏁 Arrivals</h2>
            <span className="count-badge">{arrivals.length}</span>
          </div>
          <div className="trips-list">
            {arrivals.length > 0 ? (
              arrivals.map(trip => (
                <div key={trip.id} className="trip-item">
                  <div className="trip-info">
                    <div className="trip-route">
                      <strong>{trip.origin} → {trip.destination}</strong>
                    </div>
                    <div className="trip-details">
                      <span>🚗 {trip.registration_number || 'N/A'}</span>
                      <span>👤 {trip.driver_name || 'N/A'}</span>
                      <span>⏰ {formatDateTime(trip.departure_time)}</span>
                      <span>💰 ₵{parseFloat(trip.fare).toFixed(2)}</span>
                      <span>💺 {trip.available_seats}/{trip.total_seats}</span>
                    </div>
                  </div>
                  <div className="trip-actions">
                    <button onClick={() => handleEdit(trip, 'arrival')} className="btn-edit">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(trip.id)} className="btn-delete">
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No arrivals scheduled</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDepartures;

