import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './TripStatusModal.css';

export const TRIP_STATUS_REASONS = [
  { value: 'vehicle_breakdown', label: 'Vehicle breakdown' },
  { value: 'driver_unavailable', label: 'Driver unavailable' },
  { value: 'weather', label: 'Weather conditions' },
  { value: 'route_issue', label: 'Route issue' },
  { value: 'maintenance', label: 'Scheduled maintenance' },
  { value: 'other', label: 'Other' }
];

const TripStatusModal = ({ trip, onClose, onSuccess }) => {
  const [action, setAction] = useState(trip.status === 'paused' ? 'resume' : 'pause');
  const [scope, setScope] = useState('trip');
  const [reason, setReason] = useState('vehicle_breakdown');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRecurringRelated = trip.is_recurring || trip.recurring_schedule?.template_id;

  useEffect(() => {
    setAction(trip.status === 'paused' ? 'resume' : 'pause');
  }, [trip.id, trip.status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        scope: isRecurringRelated ? scope : 'trip',
        ...(action !== 'resume' ? { reason, note: note.trim() || undefined } : {})
      };

      const response = await api.post(`/trips/${trip.id}/${action}`, payload);
      onSuccess(response.data.message || 'Trip status updated');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update trip status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trip-status-modal-overlay">
      <div className="trip-status-modal">
        <h2>Manage Trip Status</h2>
        <p className="trip-status-route">
          <strong>{trip.origin} → {trip.destination}</strong>
        </p>
        <p className="trip-status-meta">
          Current status: <span className={`status-badge ${trip.status}`}>{trip.status}</span>
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Action</label>
            <div className="action-toggle-group">
              {trip.status !== 'paused' && trip.status !== 'cancelled' && (
                <>
                  <button
                    type="button"
                    className={`action-toggle ${action === 'pause' ? 'active' : ''}`}
                    onClick={() => setAction('pause')}
                  >
                    ⏸ Pause
                  </button>
                  <button
                    type="button"
                    className={`action-toggle ${action === 'stop' ? 'active' : ''}`}
                    onClick={() => setAction('stop')}
                  >
                    ⛔ Stop
                  </button>
                </>
              )}
              {(trip.status === 'paused' || (isRecurringRelated && trip.status === 'paused')) && (
                <button
                  type="button"
                  className={`action-toggle ${action === 'resume' ? 'active' : ''}`}
                  onClick={() => setAction('resume')}
                >
                  ▶ Resume
                </button>
              )}
              {trip.status === 'cancelled' && (
                <p className="recurring-help">This trip has been stopped and cannot be resumed.</p>
              )}
            </div>
          </div>

          {isRecurringRelated && trip.status !== 'cancelled' && (
            <div className="form-group">
              <label>Apply to</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="trip">This trip only</option>
                <option value="recurring">Entire recurring schedule</option>
              </select>
            </div>
          )}

          {action !== 'resume' && trip.status !== 'cancelled' && (
            <>
              <div className="form-group">
                <label>Reason *</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} required>
                  {TRIP_STATUS_REASONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Additional note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional details for passengers and drivers"
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            {trip.status !== 'cancelled' && (
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Saving...' : action === 'pause' ? 'Pause Trip' : action === 'stop' ? 'Stop Trip' : 'Resume Trip'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripStatusModal;
