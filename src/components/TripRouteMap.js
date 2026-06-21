import React, { useEffect, useState } from 'react';
import { mapsService } from '../services/mapsService';
import './TripRouteMap.css';

const TripRouteMap = ({ origin, destination }) => {
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadEta = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await mapsService.getRouteEta(origin, destination);
        if (active) {
          setEta(data.eta);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Unable to load route details');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (origin && destination) {
      loadEta();
    }

    return () => {
      active = false;
    };
  }, [origin, destination]);

  if (loading) {
    return <div className="trip-route-map loading">Loading route and ETA...</div>;
  }

  if (error) {
    return <div className="trip-route-map error">{error}</div>;
  }

  if (!eta) {
    return null;
  }

  return (
    <div className="trip-route-map">
      <div className="route-stats">
        <div className="route-stat">
          <span className="route-stat-label">Distance</span>
          <strong>{eta.distance_text || 'N/A'}</strong>
        </div>
        <div className="route-stat">
          <span className="route-stat-label">Estimated travel time</span>
          <strong>{eta.duration_text || 'N/A'}</strong>
        </div>
        {eta.source === 'mock' && eta.message && (
          <p className="route-note">{eta.message}</p>
        )}
      </div>

      {eta.map_embed_url ? (
        <iframe
          title={`Route from ${origin} to ${destination}`}
          src={eta.map_embed_url}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="route-map-placeholder">
          Add `GOOGLE_MAPS_API_KEY` to enable the interactive route map.
        </div>
      )}
    </div>
  );
};

export default TripRouteMap;
