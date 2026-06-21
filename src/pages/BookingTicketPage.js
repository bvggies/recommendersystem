import React from 'react';
import { Link, useParams } from 'react-router-dom';
import BookingTicket from '../components/BookingTicket';
import './BookingTicketPage.css';

const BookingTicketPage = () => {
  const { id } = useParams();

  return (
    <div className="booking-ticket-page">
      <Link to="/bookings" className="back-link">← My Bookings</Link>
      <h1>Your Boarding Ticket</h1>
      <BookingTicket bookingId={parseInt(id, 10)} />
    </div>
  );
};

export default BookingTicketPage;
