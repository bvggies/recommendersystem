import api from './api';

export const trackingService = {
  getTracking: async (tripId) => {
    const response = await api.get(`/tracking/${tripId}`);
    return response.data;
  },

  startTracking: async (tripId) => {
    const response = await api.post(`/tracking/${tripId}/start`);
    return response.data;
  },

  updateLocation: async (tripId, location) => {
    const response = await api.post(`/tracking/${tripId}/location`, location);
    return response.data;
  },

  reportDelay: async (tripId, delayMinutes, reason) => {
    const response = await api.post(`/tracking/${tripId}/delay`, {
      delay_minutes: delayMinutes,
      reason
    });
    return response.data;
  },

  stopTracking: async (tripId) => {
    const response = await api.post(`/tracking/${tripId}/stop`);
    return response.data;
  }
};
