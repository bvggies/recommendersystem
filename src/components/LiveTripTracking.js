import React, { useEffect, useState } from 'react';
import { trackingService } from '../services/trackingService';
import './LiveTripTracking.css';

const LiveTripTracking = ({ tripId, compact = false }) => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tripId) return undefined;

    let active = true;

    const loadTracking = async () => {
      try {
        const data = await trackingService.getTracking(tripId);
        if (active) {
          setTracking(data.tracking);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Unable to load live tracking');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTracking();
    const interval = setInterval(loadTracking, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [tripId]);

  if (loading) {
    return <div className="live-tracking loading">Loading live tracking...</div>;
  }

  if (error) {
    return null;
  }

  if (!tracking) {
    return null;
  }

  const hasDelay = tracking.delay_minutes > 0;
  const isLive = tracking.tracking_active && tracking.last_latitude && tracking.last_longitude;
  const mapsLink = isLive
    ? `https://www.google.com/maps?q=${tracking.last_latitude},${tracking.last_longitude}`
    : null;

  const formatTime = (dateString) =>
    dateString ? new Date(dateString).toLocaleString() : 'N/A';

  if (!isLive && !hasDelay && tracking.status !== 'in-progress') {
    if (compact) return null;
    return (
      <div className="live-tracking inactive">
        <p>Live tracking will appear when the driver starts the trip.</p>
      </div>
    );
  }

  return (
    <div className={`live-tracking ${compact ? 'compact' : ''}`}>
      <div className="live-tracking-header">
        <h3>📡 Live Trip Status</h3>
        {tracking.tracking_active && <span className="live-badge">LIVE</span>}
      </div>

      {hasDelay && (
        <div className="delay-alert">
          <strong>⚠️ Delay: {tracking.delay_minutes} min</strong>
          {tracking.delay_reason && <p>{tracking.delay_reason}</p>}
          {tracking.estimated_arrival && (
            <p>New estimated departure: {formatTime(tracking.estimated_arrival)}</p>
          )}
        </div>
      )}

      {isLive && (
        <div className="location-info">
          <p><strong>Driver:</strong> {tracking.driver_name || 'On route'}</p>
          <p><strong>Last update:</strong> {formatTime(tracking.last_location_at)}</p>
          {tracking.live_eta?.duration_text && (
            <p><strong>ETA to destination:</strong> {tracking.live_eta.duration_text}</p>
          )}
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="map-link">
              View driver location on map →
            </a>
          )}
        </div>
      )}

      {!isLive && tracking.status === 'in-progress' && (
        <p className="tracking-note">Trip is in progress. Waiting for location update...</p>
      )}
    </div>
  );
};

export default LiveTripTracking;
