const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildTicketPayload,
  parseTicketPayload,
  generateBoardingToken
} = require('../utils/boardingToken');

test('generateBoardingToken returns 48-char hex string', () => {
  const token = generateBoardingToken();
  assert.match(token, /^[a-f0-9]{48}$/);
});

test('buildTicketPayload and parseTicketPayload round-trip', () => {
  const token = generateBoardingToken();
  const payload = buildTicketPayload(42, token, {
    passenger_name: 'Jane Doe',
    phone: '0241234567',
    email: 'jane@example.com',
    origin: 'Nkawkaw',
    destination: 'Accra',
    departure_time: '2025-06-21T10:00:00.000Z',
    seats_booked: 2,
    driver_name: 'Kwame Mensah',
    vehicle_type: 'VIP',
    registration_number: 'GR-1234-20',
    payment_reference: 'TRP_123'
  });
  const parsed = parseTicketPayload(payload);

  assert.equal(parsed.bookingId, 42);
  assert.equal(parsed.boardingToken, token);
  assert.match(payload, /NKAWKAW TRANSPORT TICKET/);
  assert.match(payload, /Jane Doe/);
  assert.match(payload, /Nkawkaw\s+→\s+Accra/);
  assert.match(payload, /NKTS:42:/);
});

test('parseTicketPayload accepts legacy NKTS format', () => {
  const token = generateBoardingToken();
  const parsed = parseTicketPayload(`NKTS:42:${token}`);
  assert.equal(parsed.bookingId, 42);
  assert.equal(parsed.boardingToken, token);
});

test('parseTicketPayload extracts code from formatted ticket text', () => {
  const token = generateBoardingToken();
  const payload = buildTicketPayload(7, token, {
    passenger_name: 'Sam',
    origin: 'Kumasi',
    destination: 'Tamale'
  });

  const parsed = parseTicketPayload(payload);
  assert.equal(parsed.bookingId, 7);
  assert.equal(parsed.boardingToken, token);
});

test('parseTicketPayload rejects invalid formats', () => {
  assert.equal(parseTicketPayload(''), null);
  assert.equal(parseTicketPayload('invalid'), null);
  assert.equal(parseTicketPayload('NKTS:abc:token'), null);
});
