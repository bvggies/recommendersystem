import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tripService } from '../services/tripService';
import './Trips.css';

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    origin: '',
    destination: '',
    min_fare: '',
    max_fare: '',
    vehicle_type: '',
    departure_date: ''
  });

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const { trips: tripsData } = await tripService.getTrips();
      setTrips(tripsData);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const { trips: tripsData } = await tripService.getTrips(cleanFilters);
      setTrips(tripsData);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      origin: '',
      destination: '',
      min_fare: '',
      max_fare: '',
      vehicle_type: '',
      departure_date: ''
    });
    loadTrips();
  };

  return (
    <div className="trips-page">
      <div className="trips-header">
        <h1>Find Your Trip</h1>
        <p>Search and filter available trips</p>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Origin</label>
            <input
              type="text"
              name="origin"
              value={filters.origin}
              onChange={handleFilterChange}
              placeholder="e.g., Nkawkaw"
            />
          </div>
          <div className="filter-group">
            <label>Destination</label>
            <input
              type="text"
              name="destination"
              value={filters.destination}
              onChange={handleFilterChange}
              placeholder="e.g., Accra"
            />
          </div>
          <div className="filter-group">
            <label>Min Fare (₵)</label>
            <input
              type="number"
              name="min_fare"
              value={filters.min_fare}
              onChange={handleFilterChange}
              placeholder="0"
            />
          </div>
          <div className="filter-group">
            <label>Max Fare (₵)</label>
            <input
              type="number"
              name="max_fare"
              value={filters.max_fare}
              onChange={handleFilterChange}
              placeholder="1000"
            />
          </div>
          <div className="filter-group">
            <label>Vehicle Type</label>
            <select
              name="vehicle_type"
              value={filters.vehicle_type}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              <option value="taxi">Taxi</option>
              <option value="bus">Bus</option>
              <option value="minibus">Minibus</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Departure Date</label>
            <input
              type="date"
              name="departure_date"
              value={filters.departure_date}
              onChange={handleFilterChange}
            />
          </div>
        </div>
        <div className="filter-actions">
          <button onClick={handleSearch} className="search-btn">Search</button>
          <button onClick={handleReset} className="reset-btn">Reset</button>
        </div>
      </div>

      <div className="trips-results">
        {loading ? (
          <div className="loading">Loading trips...</div>
        ) : trips.length > 0 ? (
          <div className="trips-grid">
            {trips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No trips found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TripCard = ({ trip }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="trip-card">
      <div className="trip-header">
        <h3>{trip.origin} → {trip.destination}</h3>
        <span className="trip-fare">₵{trip.fare}</span>
      </div>
      <div className="trip-details">
        <p><strong>Driver:</strong> {trip.driver_name || 'N/A'}</p>
        <p><strong>Vehicle:</strong> {trip.vehicle_type || 'N/A'} {trip.comfort_level && `(${trip.comfort_level})`}</p>
        <p><strong>Departure:</strong> {formatDate(trip.departure_time)}</p>
        <p><strong>Seats Available:</strong> {trip.available_seats}</p>
        {trip.avg_rating > 0 && (
          <p><strong>Rating:</strong> ⭐ {parseFloat(trip.avg_rating).toFixed(1)}</p>
        )}
      </div>
      <Link to={`/trips/${trip.id}`} className="view-trip-btn">View Details</Link>
    </div>
  );
};

export default Trips;

