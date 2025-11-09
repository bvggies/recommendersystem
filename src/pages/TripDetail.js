import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tripService } from '../services/tripService';
import { bookingService } from '../services/bookingService';
import './TripDetail.css';

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingBooking, setExistingBooking] = useState(null);

  const loadTrip = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tripService.getTrip(id);
      setTrip(data.trip);
    } catch (error) {
      console.error('Failed to load trip:', error);
      setError('Failed to load trip details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkExistingBooking = useCallback(async () => {
    try {
      const { bookings } = await bookingService.getMyBookings();
      const booking = bookings.find(b => b.trip_id === parseInt(id) && b.booking_status !== 'cancelled');
      if (booking) {
        setExistingBooking(booking);
      }
    } catch (error) {
      console.error('Failed to check booking:', error);
    }
  }, [id]);

  useEffect(() => {
    loadTrip();
    if (isAuthenticated) {
      checkExistingBooking();
    }
  }, [id, isAuthenticated, loadTrip, checkExistingBooking]);


  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/trips/${id}` } });
      return;
    }

    if (user?.role === 'driver') {
      setError('Drivers cannot book trips');
      return;
    }

    setError('');
    setSuccess('');

    if (seatsToBook < 1 || seatsToBook > trip.available_seats) {
      setError(`Please select between 1 and ${trip.available_seats} seats`);
      return;
    }

    try {
      const result = await bookingService.createBooking({
        trip_id: parseInt(id),
        seats_booked: seatsToBook
      });
      setSuccess(`Successfully booked ${seatsToBook} seat(s)!`);
      setExistingBooking(result.booking);
      // Reload trip to update available seats
      loadTrip();
      // Reload booking check
      checkExistingBooking();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create booking');
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingService.cancelBooking(existingBooking.id);
      setSuccess('Booking cancelled successfully');
      setExistingBooking(null);
      loadTrip();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="trip-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading trip details...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-detail-error">
        <h2>Trip Not Found</h2>
        <p>The trip you're looking for doesn't exist or has been removed.</p>
        <Link to="/trips" className="back-btn">Back to Trips</Link>
      </div>
    );
  }

  const isPastTrip = new Date(trip.departure_time) < new Date();
  const canBook = trip.status === 'scheduled' && !isPastTrip && trip.available_seats > 0 && user?.role !== 'driver';

  return (
    <div className="trip-detail-page">
      <div className="trip-detail-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1>Trip Details</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="trip-detail-container">
        {/* Main Trip Info Card */}
        <div className="trip-info-card">
          <div className="route-header">
            <div className="route-origin">
              <span className="location-icon">📍</span>
              <div>
                <p className="location-label">From</p>
                <h2>{trip.origin}</h2>
              </div>
            </div>
            <div className="route-arrow">→</div>
            <div className="route-destination">
              <span className="location-icon">📍</span>
              <div>
                <p className="location-label">To</p>
                <h2>{trip.destination}</h2>
              </div>
            </div>
          </div>

          <div className="trip-info-grid">
            <div className="info-item">
              <span className="info-icon">🕐</span>
              <div className="info-content">
                <label>Departure Time</label>
                <p>{formatDate(trip.departure_time)}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">💰</span>
              <div className="info-content">
                <label>Fare per Seat</label>
                <p className="fare-amount">₵{trip.fare}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">💺</span>
              <div className="info-content">
                <label>Available Seats</label>
                <p>{trip.available_seats} / {trip.total_seats}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">🚗</span>
              <div className="info-content">
                <label>Vehicle</label>
                <p>{trip.vehicle_type || 'N/A'} {trip.comfort_level && `(${trip.comfort_level})`}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">👤</span>
              <div className="info-content">
                <label>Driver</label>
                <p>{trip.driver_name || 'N/A'}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">📋</span>
              <div className="info-content">
                <label>Status</label>
                <p className={`status-badge ${trip.status}`}>{trip.status}</p>
              </div>
            </div>
          </div>

          {trip.avg_rating > 0 && (
            <div className="rating-section">
              <span className="rating-label">Driver Rating:</span>
              <div className="rating-stars">
                {'⭐'.repeat(Math.round(trip.avg_rating))}
                <span className="rating-value">{parseFloat(trip.avg_rating).toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Booking Section */}
        {existingBooking ? (
          <div className="booking-card existing-booking">
            <h3>✅ Your Booking</h3>
            <div className="booking-details">
              <p><strong>Seats Booked:</strong> {existingBooking.seats_booked}</p>
              <p><strong>Status:</strong> <span className={`status-badge ${existingBooking.booking_status}`}>{existingBooking.booking_status}</span></p>
              <p><strong>Booked On:</strong> {formatDate(existingBooking.created_at)}</p>
            </div>
            {existingBooking.booking_status === 'confirmed' && (
              <button onClick={handleCancelBooking} className="cancel-booking-btn">
                Cancel Booking
              </button>
            )}
          </div>
        ) : canBook ? (
          <div className="booking-card">
            <h3>Book Your Seat</h3>
            {!isAuthenticated ? (
              <div className="login-prompt">
                <p>Please log in to book a seat</p>
                <Link to="/login" className="login-btn">Login</Link>
              </div>
            ) : (
              <>
                <div className="seats-selector">
                  <label>Number of Seats</label>
                  <div className="seats-control">
                    <button
                      onClick={() => setSeatsToBook(Math.max(1, seatsToBook - 1))}
                      disabled={seatsToBook <= 1}
                      className="seat-btn"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={trip.available_seats}
                      value={seatsToBook}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setSeatsToBook(Math.max(1, Math.min(val, trip.available_seats)));
                      }}
                      className="seats-input"
                    />
                    <button
                      onClick={() => setSeatsToBook(Math.min(trip.available_seats, seatsToBook + 1))}
                      disabled={seatsToBook >= trip.available_seats}
                      className="seat-btn"
                    >
                      +
                    </button>
                  </div>
                  <p className="seats-hint">Maximum {trip.available_seats} seats available</p>
                </div>

                <div className="booking-summary">
                  <div className="summary-row">
                    <span>Seats:</span>
                    <span>{seatsToBook}</span>
                  </div>
                  <div className="summary-row">
                    <span>Fare per Seat:</span>
                    <span>₵{trip.fare}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Amount:</span>
                    <span>₵{(trip.fare * seatsToBook).toFixed(2)}</span>
                  </div>
                </div>

                <button onClick={handleBooking} className="book-btn">
                  🎫 Book {seatsToBook} Seat{seatsToBook > 1 ? 's' : ''} Now
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="booking-card unavailable">
            <h3>Booking Unavailable</h3>
            <p>
              {isPastTrip
                ? 'This trip has already departed.'
                : trip.available_seats === 0
                ? 'All seats have been booked.'
                : trip.status !== 'scheduled'
                ? 'This trip is not available for booking.'
                : 'You cannot book this trip.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripDetail;

