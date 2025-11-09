import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tripService } from '../services/tripService';
import api from '../services/api';
import './CreateTrip.css';

const CreateTrip = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    origin: 'Nkawkaw',
    destination: '',
    fare: '',
    departure_date: '',
    departure_time: '',
    total_seats: '',
    vehicle_id: '',
    is_recurring: false
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      // Get driver's vehicles
      const response = await api.get('/vehicles/driver');
      setVehicles(response.data.vehicles || []);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      // If endpoint doesn't exist or no vehicles, set empty array
      setVehicles([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.destination || !formData.fare || !formData.departure_date || 
        !formData.departure_time || !formData.total_seats) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.fare) <= 0) {
      setError('Fare must be greater than 0');
      return;
    }

    if (parseInt(formData.total_seats) <= 0) {
      setError('Total seats must be greater than 0');
      return;
    }

    // Combine date and time
    const departureDateTime = `${formData.departure_date}T${formData.departure_time}:00`;

    setLoading(true);

    try {
      const tripData = {
        origin: formData.origin,
        destination: formData.destination,
        fare: parseFloat(formData.fare),
        departure_time: departureDateTime,
        total_seats: parseInt(formData.total_seats),
        vehicle_id: formData.vehicle_id || null,
        is_recurring: formData.is_recurring
      };

      await tripService.createTrip(tripData);
      setSuccess('Trip created successfully!');
      
      // Reset form
      setFormData({
        origin: 'Nkawkaw',
        destination: '',
        fare: '',
        departure_date: '',
        departure_time: '',
        total_seats: '',
        vehicle_id: '',
        is_recurring: false
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/trips/my-trips');
      }, 2000);
    } catch (err) {
      console.error('Create trip error:', err);
      setError(err.response?.data?.error || 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="create-trip-page">
      <div className="create-trip-container">
        <div className="create-trip-header">
          <h1>🚗 Create New Trip</h1>
          <p>Add a new trip to your schedule</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="create-trip-form">
          <div className="form-section">
            <h3>📍 Route Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Origin *</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Nkawkaw"
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
                  placeholder="e.g., Accra"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>💰 Pricing & Capacity</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Fare per Passenger (₵) *</label>
                <input
                  type="number"
                  name="fare"
                  value={formData.fare}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="25.00"
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
                  placeholder="15"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>🕐 Schedule</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Departure Date *</label>
                <input
                  type="date"
                  name="departure_date"
                  value={formData.departure_date}
                  onChange={handleChange}
                  required
                  min={today}
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
          </div>

          <div className="form-section">
            <h3>🚙 Vehicle (Optional)</h3>
            <div className="form-group">
              <label>Select Vehicle</label>
              <select
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
              >
                <option value="">No vehicle selected</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number} - {vehicle.vehicle_type} ({vehicle.comfort_level})
                  </option>
                ))}
              </select>
              {vehicles.length === 0 && (
                <p className="form-hint">No vehicles registered. You can create trips without selecting a vehicle.</p>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>🔄 Recurring Trip</h3>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleChange}
                />
                <span>Make this a recurring trip</span>
              </label>
              <p className="form-hint">Recurring trips will be created automatically on the same schedule</p>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/trips/my-trips')} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Creating...' : '🚀 Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTrip;

