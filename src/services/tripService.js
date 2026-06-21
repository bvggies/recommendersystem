import api from './api';

export function buildTripFilters(filters = {}) {
  const cleaned = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const trimmed = String(value).trim();
    if (trimmed !== '') {
      cleaned[key] = trimmed;
    }
  });

  return cleaned;
}

export const tripService = {
  getTrips: async (filters = {}) => {
    const params = new URLSearchParams(buildTripFilters(filters));
    const query = params.toString();
    const response = await api.get(query ? `/trips?${query}` : '/trips');
    return response.data;
  },

  getTrip: async (id) => {
    const response = await api.get(`/trips/${id}`);
    return response.data;
  },

  createTrip: async (tripData) => {
    const response = await api.post('/trips', tripData);
    return response.data;
  },

  updateTrip: async (id, tripData) => {
    const response = await api.put(`/trips/${id}`, tripData);
    return response.data;
  },

  deleteTrip: async (id) => {
    const response = await api.delete(`/trips/${id}`);
    return response.data;
  },

  pauseTrip: async (id, data) => {
    const response = await api.post(`/trips/${id}/pause`, data);
    return response.data;
  },

  resumeTrip: async (id, data) => {
    const response = await api.post(`/trips/${id}/resume`, data);
    return response.data;
  },

  stopTrip: async (id, data) => {
    const response = await api.post(`/trips/${id}/stop`, data);
    return response.data;
  },

  getMyTrips: async () => {
    const response = await api.get('/trips/driver/my-trips');
    return response.data;
  },
};

