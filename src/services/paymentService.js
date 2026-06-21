import api from './api';

export const paymentService = {
  getConfig: async () => {
    const response = await api.get('/payments/config');
    return response.data;
  },

  initializePayment: async (payload) => {
    const response = await api.post('/payments/initialize', payload);
    return response.data;
  },

  verifyPayment: async (reference) => {
    const response = await api.get(`/payments/verify/${encodeURIComponent(reference)}`);
    return response.data;
  }
};
