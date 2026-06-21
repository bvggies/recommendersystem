import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { bookingService } from '../services/bookingService';
import { getApiErrorMessage } from '../utils/apiError';
import './BookingTicket.css';

const BookingTicket = ({ bookingId, compact = false, historical = false }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScanPreview, setShowScanPreview] = useState(false);

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
          setError(getApiErrorMessage(err, 'Unable to load ticket'));
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
    new Date(dateString).toLocaleString('en-GH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

  return (
    <div className={`boarding-pass ${compact ? 'compact' : ''} ${isHistorical ? 'historical' : ''}`}>
      <div className="boarding-pass-top">
        <div className="boarding-pass-brand">
          <span className="brand-icon">🚌</span>
          <div>
            <p className="brand-label">Nkawkaw Transport</p>
            <h3>{isHistorical ? 'Trip Record' : 'Boarding Pass'}</h3>
          </div>
        </div>
        <div className="boarding-pass-id">#{ticket.booking_id}</div>
      </div>

      <div className={`boarding-pass-status ${isVerified ? 'verified' : isHistorical ? 'record' : 'pending'}`}>
        {isVerified ? '✅ Verified at station' : isHistorical ? '📋 Trip history record' : '⏳ Awaiting station check-in'}
      </div>

      <div className="boarding-pass-route">
        <div className="route-point">
          <span className="route-label">From</span>
          <strong>{ticket.origin}</strong>
        </div>
        <div className="route-arrow" aria-hidden="true">→</div>
        <div className="route-point">
          <span className="route-label">To</span>
          <strong>{ticket.destination}</strong>
        </div>
      </div>

      <div className="boarding-pass-grid">
        <div className="pass-field">
          <span className="pass-label">Passenger</span>
          <strong>{ticket.passenger_name || 'N/A'}</strong>
        </div>
        <div className="pass-field">
          <span className="pass-label">Departure</span>
          <strong>{formatDate(ticket.departure_time)}</strong>
        </div>
        {ticket.passenger_phone && (
          <div className="pass-field">
            <span className="pass-label">Phone</span>
            <strong>{ticket.passenger_phone}</strong>
          </div>
        )}
        <div className="pass-field">
          <span className="pass-label">Seats</span>
          <strong>{ticket.seats_booked}</strong>
        </div>
        <div className="pass-field">
          <span className="pass-label">Driver</span>
          <strong>{ticket.driver_name || 'N/A'}</strong>
        </div>
        {ticket.vehicle_type && (
          <div className="pass-field">
            <span className="pass-label">Vehicle</span>
            <strong>
              {ticket.vehicle_type}
              {ticket.registration_number ? ` · ${ticket.registration_number}` : ''}
            </strong>
          </div>
        )}
        {ticket.payment_reference && (
          <div className="pass-field full-width">
            <span className="pass-label">Payment reference</span>
            <strong>{ticket.payment_reference}</strong>
          </div>
        )}
        {isVerified && ticket.checked_in_at && (
          <div className="pass-field full-width">
            <span className="pass-label">Checked in</span>
            <strong>{formatDate(ticket.checked_in_at)}</strong>
          </div>
        )}
      </div>

      <div className="boarding-pass-qr-section">
        <div className="qr-frame">
          <QRCodeSVG
            value={ticket.qr_payload}
            size={compact ? 168 : 220}
            level="M"
            includeMargin
          />
        </div>
        <p className="qr-caption">Scan at the station for quick boarding verification</p>

        <button
          type="button"
          className="scan-preview-toggle"
          onClick={() => setShowScanPreview((prev) => !prev)}
        >
          {showScanPreview ? 'Hide scan preview' : 'Preview scanned text'}
        </button>

        {showScanPreview && (
          <pre className="scan-preview">{ticket.qr_payload}</pre>
        )}

        <div className="check-in-code-box">
          <span className="pass-label">Manual check-in code</span>
          <code>{ticket.check_in_code}</code>
        </div>
      </div>
    </div>
  );
};

export default BookingTicket;
