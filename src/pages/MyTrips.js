import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tripService } from '../services/tripService';
import './MyTrips.css';

const MyTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, scheduled, completed, cancelled

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const { trips: tripsData } = await tripService.getMyTrips();
      setTrips(tripsData);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await tripService.deleteTrip(tripId);
        loadTrips();
        alert('Trip deleted successfully');
      } catch (error) {
        alert('Failed to delete trip');
      }
    }
  };

  const filteredTrips = filter === 'all' 
    ? trips 
    : trips.filter(trip => trip.status === filter);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="my-trips-page">
      <div className="my-trips-header">
        <h1>My Trips</h1>
        <Link to="/trips/create" className="create-trip-btn">➕ Create New Trip</Link>
      </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({trips.length})
        </button>
        <button 
          className={filter === 'scheduled' ? 'active' : ''}
          onClick={() => setFilter('scheduled')}
        >
          Scheduled ({trips.filter(t => t.status === 'scheduled').length})
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed ({trips.filter(t => t.status === 'completed').length})
        </button>
        <button 
          className={filter === 'cancelled' ? 'active' : ''}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled ({trips.filter(t => t.status === 'cancelled').length})
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading trips...</div>
      ) : filteredTrips.length > 0 ? (
        <div className="trips-grid">
          {filteredTrips.map(trip => (
            <div key={trip.id} className="trip-card">
              <div className="trip-header">
                <h3>{trip.origin} → {trip.destination}</h3>
                <span className={`status-badge ${trip.status}`}>
                  {trip.status}
                </span>
              </div>
              <div className="trip-details">
                <p><strong>Departure:</strong> {formatDate(trip.departure_time)}</p>
                <p><strong>Fare:</strong> ₵{trip.fare}</p>
                <p><strong>Seats:</strong> {trip.available_seats}/{trip.total_seats} available</p>
                {trip.vehicle_type && (
                  <p><strong>Vehicle:</strong> {trip.vehicle_type} ({trip.registration_number})</p>
                )}
                {trip.bookings_count > 0 && (
                  <p><strong>Bookings:</strong> {trip.bookings_count}</p>
                )}
              </div>
              <div className="trip-actions">
                <Link to={`/trips/${trip.id}`} className="btn-view">View Details</Link>
                {trip.status === 'scheduled' && (
                  <>
                    <button 
                      onClick={() => navigate(`/trips/${trip.id}/edit`)}
                      className="btn-edit"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(trip.id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No trips found</p>
          <Link to="/trips/create" className="btn-primary">Create Your First Trip</Link>
        </div>
      )}
    </div>
  );
};

export default MyTrips;

