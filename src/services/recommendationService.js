import api from './api';

export const recommendationService = {
  getRecommendations: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const response = await api.get(`/recommendations?${params.toString()}`);
    return response.data;
  },
};

