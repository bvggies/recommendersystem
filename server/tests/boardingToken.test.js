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
    full_name: 'Jane Doe',
    phone: '0241234567',
    email: 'jane@example.com'
  });
  const parsed = parseTicketPayload(payload);

  assert.equal(parsed.bookingId, 42);
  assert.equal(parsed.boardingToken, token);

  const json = JSON.parse(payload);
  assert.equal(json.passenger_name, 'Jane Doe');
  assert.equal(json.phone, '0241234567');
});

test('parseTicketPayload accepts legacy NKTS format', () => {
  const token = generateBoardingToken();
  const parsed = parseTicketPayload(`NKTS:42:${token}`);
  assert.equal(parsed.bookingId, 42);
  assert.equal(parsed.boardingToken, token);
});

test('parseTicketPayload rejects invalid formats', () => {
  assert.equal(parseTicketPayload(''), null);
  assert.equal(parseTicketPayload('invalid'), null);
  assert.equal(parseTicketPayload('NKTS:abc:token'), null);
});
