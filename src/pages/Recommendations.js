import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recommendationService } from '../services/recommendationService';
import { useAuth } from '../context/AuthContext';
import './Recommendations.css';

const Recommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    origin: '',
    destination: ''
  });

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await recommendationService.getRecommendations(filters);
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    loadRecommendations();
  };

  return (
    <div className="recommendations-page">
      <div className="recommendations-header">
        <h1>AI-Powered Recommendations</h1>
        <p>Personalized trip suggestions based on your preferences</p>
      </div>

      <div className="recommendations-filters">
        <div className="filter-inputs">
          <input
            type="text"
            name="origin"
            value={filters.origin}
            onChange={handleFilterChange}
            placeholder="From (e.g., Nkawkaw)"
          />
          <input
            type="text"
            name="destination"
            value={filters.destination}
            onChange={handleFilterChange}
            placeholder="To (e.g., Accra)"
          />
          <button onClick={handleSearch}>Get Recommendations</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading recommendations...</div>
      ) : recommendations.length > 0 ? (
        <div className="recommendations-grid">
          {recommendations.map((trip, index) => (
            <RecommendationCard key={trip.id} trip={trip} rank={index + 1} />
          ))}
        </div>
      ) : (
        <div className="no-recommendations">
          <p>No recommendations available. Try adjusting your search filters.</p>
        </div>
      )}
    </div>
  );
};

const RecommendationCard = ({ trip, rank }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="recommendation-card">
      <div className="recommendation-badge">#{rank} Recommended</div>
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

export default Recommendations;

