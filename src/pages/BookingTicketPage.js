import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import BookingTicket from '../components/BookingTicket';
import './BookingTicketPage.css';

const BookingTicketPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const paymentSuccess = location.state?.paymentSuccess;
  const tripId = location.state?.tripId;

  return (
    <div className="booking-ticket-page">
      {paymentSuccess && (
        <div className="ticket-success-banner">
          <h2>✅ Booking Complete</h2>
          <p>Your payment was successful. Show the QR code below at the station for verification.</p>
        </div>
      )}

      <Link to="/bookings" className="back-link">← My Bookings</Link>
      <h1>Your Boarding Ticket</h1>
      <BookingTicket bookingId={parseInt(id, 10)} />

      <div className="ticket-page-actions">
        {tripId && (
          <Link to={`/trips/${tripId}`} className="ticket-action-link">
            View Trip Details
          </Link>
        )}
        <Link to="/bookings" className="ticket-action-link secondary">
          All My Bookings
        </Link>
      </div>
    </div>
  );
};

export default BookingTicketPage;
