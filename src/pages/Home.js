import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tripService } from '../services/tripService';
import { recommendationService } from '../services/recommendationService';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [departures, setDepartures] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('departures'); // departures or arrivals
  const [searchFilters, setSearchFilters] = useState({
    origin: '',
    destination: ''
  });

  useEffect(() => {
    loadTrips();
    if (isAuthenticated) {
      loadRecommendations();
    }
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadTrips, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadTrips = async () => {
    try {
      // Get departures (trips leaving from Nkawkaw)
      const { trips: departuresData } = await tripService.getTrips({ 
        status: 'scheduled',
        origin: 'Nkawkaw'
      });
      
      // Get arrivals (trips arriving to Nkawkaw - we'll use destination filter)
      const { trips: arrivalsData } = await tripService.getTrips({ 
        status: 'scheduled',
        destination: 'Nkawkaw'
      });

      // Sort by departure time
      const sortedDepartures = departuresData
        .filter(trip => new Date(trip.departure_time) > new Date())
        .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time))
        .slice(0, 20);

      const sortedArrivals = arrivalsData
        .filter(trip => new Date(trip.departure_time) > new Date())
        .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time))
        .slice(0, 20);

      setDepartures(sortedDepartures);
      setArrivals(sortedArrivals);
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
      if (searchFilters.origin === 'Nkawkaw' || !searchFilters.origin) {
        setDepartures(tripsData.filter(t => new Date(t.departure_time) > new Date()));
      } else {
        setArrivals(tripsData.filter(t => new Date(t.departure_time) > new Date()));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (trip) => {
    const now = new Date();
    const departure = new Date(trip.departure_time);
    const diffMinutes = (departure - now) / (1000 * 60);

    if (diffMinutes < 0) return 'departed';
    if (diffMinutes < 15) return 'boarding';
    if (diffMinutes < 60) return 'soon';
    return 'scheduled';
  };

  const getStatusText = (trip) => {
    const status = getStatusColor(trip);
    switch (status) {
      case 'departed': return 'Departed';
      case 'boarding': return 'Boarding';
      case 'soon': return 'Soon';
      default: return 'Scheduled';
    }
  };

  const tripsToShow = activeTab === 'departures' ? departures : arrivals;

  return (
    <div className="home-container">
      {/* Header Section */}
      <div className="station-header">
        <div className="station-info">
          <h1>🛤️ Nkawkaw New Station</h1>
          <p className="station-subtitle">Real-time Departures & Arrivals</p>
          <div className="current-time">
            {new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      {/* Quick Search */}
      <div className="quick-search-section">
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
          <button onClick={handleSearch}>🔍 Search</button>
        </div>
      </div>

      {/* Dashboard Link for Authenticated Users */}
      {isAuthenticated && (
        <div className="dashboard-link-section">
          <Link to="/dashboard" className="dashboard-link-btn">
            🚀 Go to Dashboard
          </Link>
        </div>
      )}

      {/* Departures & Arrivals Board */}
      <div className="flight-board-container">
        <div className="board-tabs">
          <button 
            className={`tab ${activeTab === 'departures' ? 'active' : ''}`}
            onClick={() => setActiveTab('departures')}
          >
            ✈️ Departures
          </button>
          <button 
            className={`tab ${activeTab === 'arrivals' ? 'active' : ''}`}
            onClick={() => setActiveTab('arrivals')}
          >
            🏁 Arrivals
          </button>
        </div>

        <div className="flight-board">
          <div className="board-header">
            <div className="board-col time">Time</div>
            <div className="board-col route">Route</div>
            <div className="board-col vehicle">Vehicle</div>
            <div className="board-col driver">Driver</div>
            <div className="board-col seats">Seats</div>
            <div className="board-col fare">Fare</div>
            <div className="board-col status">Status</div>
          </div>

          {loading ? (
            <div className="board-loading">
              <div className="loading-spinner"></div>
              <p>Loading {activeTab}...</p>
            </div>
          ) : tripsToShow.length > 0 ? (
            <div className="board-rows">
              {tripsToShow.map(trip => (
                <div key={trip.id} className={`board-row status-${getStatusColor(trip)}`}>
                  <div className="board-col time">
                    <div className="time-primary">{formatTime(trip.departure_time)}</div>
                    <div className="time-secondary">{formatDate(trip.departure_time)}</div>
                  </div>
                  <div className="board-col route">
                    <div className="route-path">
                      <span className="route-from">{trip.origin}</span>
                      <span className="route-arrow">→</span>
                      <span className="route-to">{trip.destination}</span>
                    </div>
                  </div>
                  <div className="board-col vehicle">
                    <div className="vehicle-info">
                      <span className="vehicle-number">{trip.registration_number || 'N/A'}</span>
                      <span className="vehicle-type">{trip.vehicle_type || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="board-col driver">
                    <span className="driver-name">{trip.driver_name || 'N/A'}</span>
                  </div>
                  <div className="board-col seats">
                    <span className={`seats-available ${trip.available_seats < 5 ? 'low' : ''}`}>
                      {trip.available_seats}/{trip.total_seats}
                    </span>
                  </div>
                  <div className="board-col fare">
                    <span className="fare-amount">₵{parseFloat(trip.fare).toFixed(2)}</span>
                  </div>
                  <div className="board-col status">
                    <span className={`status-badge ${getStatusColor(trip)}`}>
                      {getStatusText(trip)}
                    </span>
                    {trip.avg_rating > 0 && (
                      <span className="rating-badge">⭐ {parseFloat(trip.avg_rating).toFixed(1)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="board-empty">
              <p>No {activeTab} scheduled at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Section */}
      {isAuthenticated && recommendations.length > 0 && (
        <section className="recommendations-section">
          <h2>✨ Recommended for You</h2>
          <div className="trips-grid">
            {recommendations.slice(0, 6).map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}
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
