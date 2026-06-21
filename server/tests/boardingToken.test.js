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
  const payload = buildTicketPayload(42, token);
  const parsed = parseTicketPayload(payload);

  assert.equal(parsed.bookingId, 42);
  assert.equal(parsed.boardingToken, token);
});

test('parseTicketPayload rejects invalid formats', () => {
  assert.equal(parseTicketPayload(''), null);
  assert.equal(parseTicketPayload('invalid'), null);
  assert.equal(parseTicketPayload('NKTS:abc:token'), null);
});
