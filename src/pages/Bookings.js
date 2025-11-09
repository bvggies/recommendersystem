import React, { useState, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import { useAuth } from '../context/AuthContext';
import './Bookings.css';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { bookings: bookingsData } = await bookingService.getMyBookings();
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await bookingService.cancelBooking(bookingId);
        loadBookings();
        alert('Booking cancelled successfully');
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to cancel booking');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bookings-page">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p>View and manage your trip bookings</p>
      </div>

      {loading ? (
        <div className="loading">Loading bookings...</div>
      ) : bookings.length > 0 ? (
        <div className="bookings-list">
          {bookings.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-header">
                <h3>{booking.origin} → {booking.destination}</h3>
                <span className={`booking-status ${booking.booking_status}`}>
                  {booking.booking_status}
                </span>
              </div>
              <div className="booking-details">
                <p><strong>Driver:</strong> {booking.driver_name || 'N/A'}</p>
                <p><strong>Vehicle:</strong> {booking.vehicle_type || 'N/A'}</p>
                <p><strong>Departure:</strong> {formatDate(booking.departure_time)}</p>
                <p><strong>Fare:</strong> ₵{booking.fare}</p>
                <p><strong>Seats:</strong> {booking.seats_booked}</p>
                <p><strong>Total:</strong> ₵{booking.fare * booking.seats_booked}</p>
                <p><strong>Status:</strong> {booking.trip_status}</p>
              </div>
              {booking.booking_status === 'confirmed' && booking.trip_status === 'scheduled' && (
                <button
                  onClick={() => handleCancel(booking.id)}
                  className="cancel-booking-btn"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-bookings">
          <p>You don't have any bookings yet.</p>
          <a href="/trips" className="browse-trips-btn">Browse Trips</a>
        </div>
      )}
    </div>
  );
};

export default Bookings;

