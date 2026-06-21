import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { tripService, buildTripFilters } from '../services/tripService';
import './Trips.css';

const EMPTY_FILTERS = {
  origin: '',
  destination: '',
  min_fare: '',
  max_fare: '',
  vehicle_type: '',
  departure_date: ''
};

const Trips = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    min_fare: searchParams.get('min_fare') || '',
    max_fare: searchParams.get('max_fare') || '',
    vehicle_type: searchParams.get('vehicle_type') || '',
    departure_date: searchParams.get('departure_date') || ''
  });

  const fetchTrips = useCallback(async (filterValues, searched = false) => {
    setLoading(true);
    try {
      const cleanFilters = buildTripFilters(filterValues);
      const requestFilters = {
        ...cleanFilters,
        status: 'scheduled'
      };

      const { trips: tripsData } = await tripService.getTrips(requestFilters);
      setTrips(tripsData || []);
      setHasSearched(searched || Object.keys(cleanFilters).length > 0);
    } catch (error) {
      console.error('Failed to load trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlFilters = {
      ...EMPTY_FILTERS,
      origin: searchParams.get('origin') || '',
      destination: searchParams.get('destination') || '',
      min_fare: searchParams.get('min_fare') || '',
      max_fare: searchParams.get('max_fare') || '',
      vehicle_type: searchParams.get('vehicle_type') || '',
      departure_date: searchParams.get('departure_date') || ''
    };

    setFilters(urlFilters);
    fetchTrips(urlFilters, searchParams.toString().length > 0);
  }, [searchParams, fetchTrips]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e?.preventDefault();

    const cleanFilters = buildTripFilters(filters);
    const params = new URLSearchParams(cleanFilters);
    setSearchParams(params);
  };

  const handleReset = () => {
    setFilters({ ...EMPTY_FILTERS });
    setSearchParams({});
  };

  return (
    <div className="trips-page">
      <div className="trips-header">
        <h1>Find Your Trip</h1>
        <p>Search and filter available trips</p>
      </div>

      <form className="filters-section" onSubmit={handleSearch}>
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
          <button type="submit" className="search-btn">Search</button>
          <button type="button" onClick={handleReset} className="reset-btn">Reset</button>
        </div>
      </form>

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
            <p>
              {hasSearched
                ? 'No trips found matching your search. Try different locations or dates.'
                : 'No scheduled trips are available right now.'}
            </p>
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
