import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tripService } from '../services/tripService';
import { trackingService } from '../services/trackingService';
import './DriverTripManage.css';

const DriverTripManage = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [delayReason, setDelayReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const watchIdRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [tripData, trackingData] = await Promise.all([
        tripService.getTrip(tripId),
        trackingService.getTracking(tripId)
      ]);
      setTrip(tripData.trip);
      setTracking(trackingData.tracking);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const sendLocation = async (position) => {
    try {
      await trackingService.updateLocation(tripId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : null
      });
    } catch (err) {
      console.error('Location update failed:', err);
    }
  };

  const handleStartTracking = async () => {
    setError('');
    setMessage('');

    try {
      await trackingService.startTracking(tripId);
      setMessage('Live tracking started');

      if (!navigator.geolocation) {
        setError('Geolocation is not supported on this device');
        return;
      }

      setSharing(true);

      watchIdRef.current = navigator.geolocation.watchPosition(
        sendLocation,
        (geoError) => setError(geoError.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );

      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start tracking');
    }
  };

  const handleStopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
    setMessage('Location sharing stopped (trip still active)');
  };

  const handleReportDelay = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const result = await trackingService.reportDelay(tripId, delayMinutes, delayReason);
      setMessage(result.message);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to report delay');
    }
  };

  const handleCompleteTrip = async () => {
    if (!window.confirm('Mark this trip as completed and stop tracking?')) {
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      await trackingService.stopTracking(tripId);
      setSharing(false);
      setMessage('Trip completed');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete trip');
    }
  };

  if (loading) {
    return <div className="driver-trip-manage loading">Loading...</div>;
  }

  if (!trip) {
    return (
      <div className="driver-trip-manage error">
        <p>Trip not found</p>
        <Link to="/trips/my-trips">Back to My Trips</Link>
      </div>
    );
  }

  return (
    <div className="driver-trip-manage">
      <div className="manage-header">
        <Link to="/trips/my-trips" className="back-link">← My Trips</Link>
        <h1>Trip Operations</h1>
        <p>{trip.origin} → {trip.destination}</p>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="manage-grid">
        <section className="manage-card">
          <h2>📡 Live Tracking</h2>
          <p className="status-line">Status: <strong>{trip.status}</strong></p>
          {tracking?.tracking_active && (
            <p className="status-line live">Sharing location with passengers</p>
          )}
          {tracking?.last_location_at && (
            <p className="status-line">Last update: {new Date(tracking.last_location_at).toLocaleString()}</p>
          )}

          <div className="manage-actions">
            {!sharing && trip.status !== 'completed' && (
              <button onClick={handleStartTracking} className="btn-primary">
                Start Live Tracking
              </button>
            )}
            {sharing && (
              <button onClick={handleStopSharing} className="btn-secondary">
                Stop Sharing Location
              </button>
            )}
            {trip.status !== 'completed' && (
              <button onClick={handleCompleteTrip} className="btn-danger">
                Complete Trip
              </button>
            )}
          </div>
        </section>

        <section className="manage-card">
          <h2>⚠️ Report Delay</h2>
          <p>Passengers with bookings will be notified immediately.</p>
          <form onSubmit={handleReportDelay} className="delay-form">
            <label>
              Delay (minutes)
              <input
                type="number"
                min="1"
                max="480"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value, 10) || 1)}
              />
            </label>
            <label>
              Reason (optional)
              <input
                type="text"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="Traffic, breakdown, etc."
              />
            </label>
            <button type="submit" className="btn-warning">Notify Passengers</button>
          </form>
          {tracking?.delay_minutes > 0 && (
            <p className="current-delay">Current delay: {tracking.delay_minutes} min — {tracking.delay_reason}</p>
          )}
        </section>

        <section className="manage-card">
          <h2>🎫 Boarding Check-in</h2>
          <p>Scan passenger QR tickets at the station.</p>
          <Link to={`/driver/check-in?trip=${tripId}`} className="btn-primary link-btn">
            Open Check-in Scanner
          </Link>
        </section>
      </div>
    </div>
  );
};

export default DriverTripManage;
