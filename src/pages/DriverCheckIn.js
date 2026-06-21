import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { tripService } from '../services/tripService';
import { bookingService } from '../services/bookingService';
import './DriverCheckIn.css';

const DriverCheckIn = () => {
  const [searchParams] = useSearchParams();
  const initialTripId = searchParams.get('trip') || '';

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(initialTripId);
  const [passengers, setPassengers] = useState([]);
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const { trips: tripsData } = await tripService.getMyTrips();
        const activeTrips = tripsData.filter(t =>
          ['scheduled', 'in-progress', 'paused'].includes(t.status)
        );
        setTrips(activeTrips);
        if (!initialTripId && activeTrips.length > 0) {
          setSelectedTripId(String(activeTrips[0].id));
        }
      } catch (err) {
        setError('Failed to load trips');
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [initialTripId]);

  useEffect(() => {
    if (!selectedTripId) {
      setPassengers([]);
      return;
    }

    const loadPassengers = async () => {
      try {
        const { passengers: list } = await bookingService.getTripPassengers(selectedTripId);
        setPassengers(list);
      } catch (err) {
        console.error('Failed to load passengers:', err);
      }
    };

    loadPassengers();
  }, [selectedTripId, message]);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!ticketCode.trim()) {
      setError('Enter or paste a ticket code');
      return;
    }

    setCheckingIn(true);
    setError('');
    setMessage('');

    try {
      const result = await bookingService.checkIn({
        ticketCode: ticketCode.trim(),
        tripId: selectedTripId ? parseInt(selectedTripId, 10) : undefined
      });
      setMessage(result.message);
      setTicketCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const checkedInCount = passengers.filter(p => p.checked_in_at).length;

  return (
    <div className="driver-check-in">
      <div className="check-in-header">
        <Link to="/trips/my-trips" className="back-link">← My Trips</Link>
        <h1>🎫 Boarding Check-in</h1>
        <p>Scan or paste passenger QR ticket codes at the station</p>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="check-in-layout">
        <section className="check-in-card">
          <label>
            Select trip
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose a trip...</option>
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  {trip.origin} → {trip.destination} ({new Date(trip.departure_time).toLocaleString()})
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={handleCheckIn} className="check-in-form">
            <label>
              Ticket code (from QR scan)
              <input
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="NKTS:123:abc..."
                autoComplete="off"
              />
            </label>
            <button type="submit" disabled={checkingIn || !selectedTripId} className="btn-primary">
              {checkingIn ? 'Checking in...' : 'Check In Passenger'}
            </button>
          </form>
        </section>

        <section className="check-in-card roster">
          <h2>Passenger roster</h2>
          {selectedTripId ? (
            <>
              <p className="roster-summary">
                {checkedInCount} / {passengers.length} checked in
              </p>
              {passengers.length > 0 ? (
                <ul className="passenger-list">
                  {passengers.map(p => (
                    <li key={p.id} className={p.checked_in_at ? 'checked-in' : ''}>
                      <div>
                        <strong>{p.passenger_name}</strong>
                        <span>{p.seats_booked} seat(s)</span>
                      </div>
                      <span className="check-status">
                        {p.checked_in_at ? '✅ Checked in' : '⏳ Waiting'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-roster">No confirmed bookings for this trip yet.</p>
              )}
            </>
          ) : (
            <p className="empty-roster">Select a trip to view passengers.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default DriverCheckIn;
