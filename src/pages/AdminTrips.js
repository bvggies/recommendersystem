import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { tripService } from '../services/tripService';
import RecurringTripFields, { ALL_RECURRING_DAYS } from '../components/RecurringTripFields';
import TripStatusModal from '../components/TripStatusModal';
import './AdminTrips.css';

const formatRecurringSummary = (trip) => {
  if (!trip.is_recurring) return null;

  const schedule = trip.recurring_schedule || {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = schedule.days_of_week || ALL_RECURRING_DAYS;
  const time = schedule.time || '';

  if (days.length === 7) {
    return `Daily at ${time}`;
  }

  return `${days.map((day) => dayNames[day]).join(', ')} at ${time}`;
};

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
    status: 'scheduled',
    is_recurring: false,
    recurring_days: ALL_RECURRING_DAYS
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusTrip, setStatusTrip] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tripsRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/trips?status=all&include_templates=true'),
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
      setError(`Failed to load data (${status || 'Network Error'}): ${errorMsg}`);
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

  const handleRecurringToggle = (e) => {
    setFormData({
      ...formData,
      is_recurring: e.target.checked,
      recurring_days: formData.recurring_days.length ? formData.recurring_days : ALL_RECURRING_DAYS
    });
  };

  const handleDayToggle = (day) => {
    const days = formData.recurring_days.includes(day)
      ? formData.recurring_days.filter((value) => value !== day)
      : [...formData.recurring_days, day].sort((a, b) => a - b);

    setFormData({ ...formData, recurring_days: days });
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

    if (formData.is_recurring && formData.recurring_days.length === 0) {
      setError('Select at least one day for a recurring trip');
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
        total_seats: parseInt(formData.total_seats, 10),
        status: formData.status,
        is_recurring: formData.is_recurring
      };

      if (formData.is_recurring) {
        tripData.recurring_schedule = { days_of_week: formData.recurring_days };
      } else if (editingTrip?.is_recurring) {
        tripData.is_recurring = false;
      }

      if (editingTrip?.recurring_schedule?.template_id && !editingTrip?.is_recurring) {
        delete tripData.is_recurring;
        delete tripData.recurring_schedule;
      }

      if (editingTrip) {
        await tripService.updateTrip(editingTrip.id, tripData);
        setSuccess(formData.is_recurring
          ? 'Recurring trip updated. Future departures will follow the new schedule.'
          : 'Trip updated successfully!');
      } else {
        await tripService.createTrip(tripData);
        setSuccess(formData.is_recurring
          ? 'Recurring trip created. Upcoming departures have been scheduled.'
          : 'Trip created successfully!');
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
      is_recurring: false,
      recurring_days: ALL_RECURRING_DAYS
    });
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    const departure = new Date(trip.departure_time);
    const schedule = trip.recurring_schedule || {};
    const isTemplate = Boolean(trip.is_recurring);

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
      is_recurring: isTemplate,
      recurring_days: isTemplate ? (schedule.days_of_week || ALL_RECURRING_DAYS) : ALL_RECURRING_DAYS
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

      {statusTrip && (
        <TripStatusModal
          trip={statusTrip}
          onClose={() => setStatusTrip(null)}
          onSuccess={(message) => {
            setSuccess(message);
            loadData();
          }}
        />
      )}

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
                  <label>{formData.is_recurring ? 'Effective From *' : 'Departure Date *'}</label>
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

              {!editingTrip?.recurring_schedule?.template_id || editingTrip?.is_recurring ? (
                <RecurringTripFields
                  isRecurring={formData.is_recurring}
                  recurringDays={formData.recurring_days}
                  onRecurringToggle={handleRecurringToggle}
                  onDayToggle={handleDayToggle}
                />
              ) : (
                <p className="recurring-help">
                  This departure was auto-generated from a recurring schedule. Edit the recurring template to change future trips.
                </p>
              )}

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
              <th>Schedule</th>
              <th>Fare</th>
              <th>Seats</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.length > 0 ? (
              trips.map(trip => (
                <tr key={trip.id} className={trip.is_recurring ? 'recurring-template-row' : ''}>
                  <td>
                    <strong>{trip.origin} → {trip.destination}</strong>
                  </td>
                  <td>{trip.driver_name || 'N/A'}</td>
                  <td>{trip.registration_number || 'N/A'}</td>
                  <td>{formatDateTime(trip.departure_time)}</td>
                  <td>
                    {trip.is_recurring ? (
                      <span className="recurring-badge" title={formatRecurringSummary(trip)}>
                        🔁 {formatRecurringSummary(trip)}
                      </span>
                    ) : trip.recurring_schedule?.template_id ? (
                      <span className="generated-badge">Auto-scheduled</span>
                    ) : (
                      'One-time'
                    )}
                  </td>
                  <td>₵{parseFloat(trip.fare).toFixed(2)}</td>
                  <td>{trip.available_seats}/{trip.total_seats}</td>
                  <td>
                    <span className={`status-badge ${trip.status}`}>
                      {trip.status}
                    </span>
                    {trip.status_reason && (
                      <div className="status-reason">{trip.status_reason.replace(/_/g, ' ')}</div>
                    )}
                  </td>
                  <td>
                    {(trip.status === 'scheduled' || trip.status === 'paused') && (
                      <button onClick={() => setStatusTrip(trip)} className="btn-status">
                        {trip.status === 'paused' ? '▶ Manage' : '⏸ Pause/Stop'}
                      </button>
                    )}
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
                <td colSpan="9" className="no-data">No trips found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTrips;
