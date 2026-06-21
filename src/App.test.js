import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('./services/authService', () => ({
  authService: {
    getCurrentUser: jest.fn().mockRejectedValue(new Error('No session')),
    login: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock('./services/tripService', () => ({
  tripService: {
    getTrips: jest.fn().mockResolvedValue({ trips: [] }),
  },
}));

jest.mock('./services/recommendationService', () => ({
  recommendationService: {
    getRecommendations: jest.fn().mockResolvedValue({ recommendations: [] }),
  },
}));

test('renders the transport app shell', async () => {
  render(<App />);
  expect(await screen.findByText(/Nkawkaw Transport/i)).toBeInTheDocument();
});
