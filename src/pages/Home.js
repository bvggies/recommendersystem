import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tripService } from '../services/tripService';
import { recommendationService } from '../services/recommendationService';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    origin: '',
    destination: ''
  });

  useEffect(() => {
    loadTrips();
    if (isAuthenticated) {
      loadRecommendations();
    }
  }, [isAuthenticated]);

  const loadTrips = async () => {
    try {
      const { trips: tripsData } = await tripService.getTrips({ status: 'scheduled' });
      setTrips(tripsData.slice(0, 6));
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await recommendationService.getRecommendations();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const { trips: tripsData } = await tripService.getTrips(searchFilters);
      setTrips(tripsData);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to Nkawkaw New Station</h1>
        <p>Find the best transport options for your journey</p>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="From (e.g., Nkawkaw)"
            value={searchFilters.origin}
            onChange={(e) => setSearchFilters({ ...searchFilters, origin: e.target.value })}
          />
          <input
            type="text"
            placeholder="To (e.g., Accra)"
            value={searchFilters.destination}
            onChange={(e) => setSearchFilters({ ...searchFilters, destination: e.target.value })}
          />
          <button onClick={handleSearch}>Search Trips</button>
        </div>
      </div>

      {isAuthenticated && recommendations.length > 0 && (
        <section className="recommendations-section">
          <h2>Recommended for You</h2>
          <div className="trips-grid">
            {recommendations.slice(0, 6).map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      <section className="trips-section">
        <h2>Available Trips</h2>
        {loading ? (
          <div className="loading">Loading trips...</div>
        ) : trips.length > 0 ? (
          <div className="trips-grid">
            {trips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <p>No trips available at the moment.</p>
        )}
      </section>
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

export default Home;

