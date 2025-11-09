import api from './api';

export const ratingService = {
  createRating: async (ratingData) => {
    const response = await api.post('/ratings', ratingData);
    return response.data;
  },

  getDriverRatings: async (driverId) => {
    const response = await api.get(`/ratings/driver/${driverId}`);
    return response.data;
  },

  getTripRatings: async (tripId) => {
    const response = await api.get(`/ratings/trip/${tripId}`);
    return response.data;
  },
};

