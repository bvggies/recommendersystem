import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import LiveTripTracking from '../components/LiveTripTracking';
import './Bookings.css';

const Bookings = () => {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [filter, setFilter] = useState(location.state?.filter || 'upcoming');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { bookings: bookingsData } = await bookingService.getMyBookings(filter);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

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

  const handleVerifyPayment = async (booking) => {
    if (!booking.payment_reference) {
      alert('No payment reference found for this booking.');
      return;
    }

    setVerifyingId(booking.id);
    try {
      await paymentService.verifyPayment(booking.payment_reference);
      await loadBookings();
      alert('Payment verified successfully.');
    } catch (error) {
      alert(error.response?.data?.error || 'Payment verification failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isUpcoming = (booking) =>
    new Date(booking.departure_time) > new Date() &&
    !['completed', 'cancelled'].includes(booking.trip_status);

  return (
    <div className="bookings-page">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p>{filter === 'history' ? 'Your trip history with QR verification records' : 'View and manage your upcoming trips'}</p>
      </div>

      <div className="bookings-filter-tabs">
        <button
          className={filter === 'upcoming' ? 'active' : ''}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={filter === 'history' ? 'active' : ''}
          onClick={() => setFilter('history')}
        >
          Trip History
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading bookings...</div>
      ) : bookings.length > 0 ? (
        <div className="bookings-list">
          {bookings.map(booking => (
            <div key={booking.id} className={`booking-card ${filter === 'history' ? 'history-card' : ''}`}>
              <div className="booking-header">
                <h3>
                  <Link to={`/trips/${booking.trip_id}`} className="trip-link">
                    {booking.origin} → {booking.destination}
                  </Link>
                </h3>
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
                <p><strong>Total:</strong> ₵{(booking.fare * booking.seats_booked).toFixed(2)}</p>
                <p><strong>Payment:</strong> {booking.payment_status} {booking.payment_method ? `(${booking.payment_method.replace(/_/g, ' ')})` : ''}</p>
                {booking.payment_reference && (
                  <p><strong>Reference:</strong> {booking.payment_reference}</p>
                )}
                <p><strong>Trip Status:</strong> {booking.trip_status}</p>
                {booking.verified && booking.checked_in_at && (
                  <p className="verified-label">✅ Verified at station — {formatDate(booking.checked_in_at)}</p>
                )}
              </div>
              {booking.payment_status === 'paid' && booking.booking_status !== 'cancelled' && (
                <>
                  {filter === 'upcoming' && isUpcoming(booking) && (
                    <LiveTripTracking tripId={booking.trip_id} compact />
                  )}
                  <div className="booking-actions">
                    <Link to={`/trips/${booking.trip_id}`} className="trip-detail-link-btn">
                      View Trip Details
                    </Link>
                    <Link to={`/bookings/${booking.id}/ticket`} className="ticket-link-btn">
                      🎫 {filter === 'history' ? 'View QR Record' : 'View Boarding Ticket'}
                    </Link>
                  </div>
                </>
              )}
              {booking.booking_status === 'pending' && booking.payment_status === 'pending' && (
                <button
                  onClick={() => handleVerifyPayment(booking)}
                  className="verify-payment-btn"
                  disabled={verifyingId === booking.id}
                >
                  {verifyingId === booking.id ? 'Verifying...' : 'Verify Payment'}
                </button>
              )}
              {filter === 'upcoming' &&
                (booking.booking_status === 'confirmed' || booking.booking_status === 'pending') &&
                booking.trip_status === 'scheduled' &&
                isUpcoming(booking) && (
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
          <p>{filter === 'history' ? 'No past trips yet.' : 'You don\'t have any upcoming bookings.'}</p>
          <Link to="/trips" className="browse-trips-btn">Browse Trips</Link>
        </div>
      )}
    </div>
  );
};

export default Bookings;
