import api from './api';

export const mapsService = {
  getConfig: async () => {
    const response = await api.get('/maps/config');
    return response.data;
  },

  getRouteEta: async (origin, destination, refresh = false) => {
    const params = new URLSearchParams({
      origin,
      destination
    });

    if (refresh) {
      params.set('refresh', 'true');
    }

    const response = await api.get(`/maps/eta?${params.toString()}`);
    return response.data;
  }
};
