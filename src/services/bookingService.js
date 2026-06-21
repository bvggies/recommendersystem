import api from './api';

export const bookingService = {
  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  getMyBookings: async (status) => {
    const params = status ? { status } : {};
    const response = await api.get('/bookings/my-bookings', { params });
    return response.data;
  },

  getMyBookingForTrip: async (tripId) => {
    const response = await api.get(`/bookings/trip/${tripId}/mine`);
    return response.data;
  },

  cancelBooking: async (id) => {
    const response = await api.put(`/bookings/${id}/cancel`);
    return response.data;
  },

  getTicket: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/ticket`);
    return response.data;
  },

  checkIn: async ({ ticketCode, boardingToken, tripId }) => {
    const response = await api.post('/bookings/check-in', {
      ticket_code: ticketCode,
      boarding_token: boardingToken,
      trip_id: tripId
    });
    return response.data;
  },

  getTripPassengers: async (tripId) => {
    const response = await api.get(`/bookings/for-trip/${tripId}/passengers`);
    return response.data;
  }
};

