const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const app = require('../server');

test('GET /api/health returns OK', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'OK');
  assert.match(response.body.message, /Transport Recommender API/);
});

test('GET /api/trips/driver/my-trips requires authentication', async () => {
  const response = await request(app).get('/api/trips/driver/my-trips');

  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Access token required');
});

test('POST /api/bookings validates trip_id', async () => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: 1, username: 'passenger', role: 'passenger' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const response = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ seats_booked: 1 });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Trip ID is required');
});

test('POST /api/bookings rejects invalid seats_booked', async () => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: 1, username: 'passenger', role: 'passenger' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const response = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ trip_id: 1, seats_booked: 0 });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /positive integer/);
});

test('POST /api/trips/:id/pause requires reason', async () => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: 1, username: 'admin', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const response = await request(app)
    .post('/api/trips/1/pause')
    .set('Authorization', `Bearer ${token}`)
    .send({ scope: 'trip' });

  assert.ok([400, 403, 404].includes(response.status));
});

test('GET /api/tracking/:tripId requires authentication', async () => {
  const response = await request(app).get('/api/tracking/1');

  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Access token required');
});

test('POST /api/bookings/check-in requires ticket code', async () => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: 1, username: 'driver', role: 'driver' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const response = await request(app)
    .post('/api/bookings/check-in')
    .set('Authorization', `Bearer ${token}`)
    .send({});

  assert.equal(response.status, 400);
  assert.match(response.body.error, /required/);
});

test('GET /api/bookings/trip/:tripId/mine requires authentication', async () => {
  const response = await request(app).get('/api/bookings/trip/1/mine');

  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Access token required');
});

test('POST /api/tracking/:tripId/delay validates delay_minutes', async () => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: 1, username: 'driver', role: 'driver' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const response = await request(app)
    .post('/api/tracking/1/delay')
    .set('Authorization', `Bearer ${token}`)
    .send({ delay_minutes: 0 });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /positive integer/);
});
