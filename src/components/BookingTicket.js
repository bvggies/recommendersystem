import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { bookingService } from '../services/bookingService';
import './BookingTicket.css';

const BookingTicket = ({ bookingId, compact = false, historical = false }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadTicket = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await bookingService.getTicket(bookingId);
        if (active) {
          setTicket(data.ticket);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Unable to load ticket');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (bookingId) {
      loadTicket();
    }

    return () => {
      active = false;
    };
  }, [bookingId]);

  if (loading) {
    return <div className="booking-ticket loading">Loading ticket...</div>;
  }

  if (error) {
    return <div className="booking-ticket error">{error}</div>;
  }

  if (!ticket) {
    return null;
  }

  const isHistorical = historical || ticket.is_historical;
  const isVerified = ticket.verified || Boolean(ticket.checked_in_at);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <div className={`booking-ticket ${compact ? 'compact' : ''} ${isHistorical ? 'historical' : ''}`}>
      <div className="ticket-header">
        <h3>{isHistorical ? '📋 Trip Record' : '🎫 Boarding Ticket'}</h3>
        <span className="ticket-id">#{ticket.booking_id}</span>
      </div>

      <div className={`verification-badge ${isVerified ? 'verified' : 'pending'}`}>
        {isVerified ? (
          <>
            <span className="verification-icon">✅</span>
            <div>
              <strong>Verified at station</strong>
              <p>{formatDate(ticket.checked_in_at)}</p>
            </div>
          </>
        ) : isHistorical ? (
          <>
            <span className="verification-icon">📄</span>
            <div>
              <strong>Boarding record</strong>
              <p>QR kept for your trip history</p>
            </div>
          </>
        ) : (
          <>
            <span className="verification-icon">⏳</span>
            <div>
              <strong>Awaiting check-in</strong>
              <p>Show QR code at the station to board</p>
            </div>
          </>
        )}
      </div>

      <div className="ticket-route">
        <strong>{ticket.origin}</strong>
        <span>→</span>
        <strong>{ticket.destination}</strong>
      </div>

      <div className="ticket-meta">
        <p><strong>Departure:</strong> {formatDate(ticket.departure_time)}</p>
        <p><strong>Seats:</strong> {ticket.seats_booked}</p>
        <p><strong>Driver:</strong> {ticket.driver_name}</p>
        {ticket.vehicle_type && (
          <p><strong>Vehicle:</strong> {ticket.vehicle_type} {ticket.registration_number && `(${ticket.registration_number})`}</p>
        )}
        {isHistorical && ticket.trip_status && (
          <p><strong>Trip status:</strong> {ticket.trip_status}</p>
        )}
      </div>

      <div className="ticket-qr">
        <QRCodeSVG value={ticket.qr_payload} size={compact ? 140 : 180} level="M" />
        <p className="ticket-qr-hint">
          {isHistorical
            ? 'Permanent QR record — drivers can verify this code anytime'
            : 'Show this QR code at boarding'}
        </p>
        <p className="ticket-code">{ticket.qr_payload}</p>
      </div>
    </div>
  );
};

export default BookingTicket;
