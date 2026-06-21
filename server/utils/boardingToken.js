const crypto = require('crypto');

function generateBoardingToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildTicketPayload(bookingId, boardingToken, passenger = {}) {
  const code = `NKTS:${bookingId}:${boardingToken}`;

  return JSON.stringify({
    v: 1,
    code,
    booking_id: bookingId,
    passenger_name: passenger.full_name || passenger.passenger_name || null,
    phone: passenger.phone || null,
    email: passenger.email || null,
    token: boardingToken
  });
}

function parseTicketPayload(payload) {
  if (!payload) return null;

  const trimmed = String(payload).trim();

  try {
    const json = JSON.parse(trimmed);
    if (json.code) {
      return parseTicketPayload(json.code);
    }
    if (json.booking_id && json.token) {
      return {
        bookingId: parseInt(json.booking_id, 10),
        boardingToken: json.token
      };
    }
  } catch {
    // Not JSON — fall through to legacy format
  }

  const match = trimmed.match(/^NKTS:(\d+):([a-f0-9]+)$/i);

  if (!match) {
    return null;
  }

  return {
    bookingId: parseInt(match[1], 10),
    boardingToken: match[2]
  };
}

module.exports = {
  generateBoardingToken,
  buildTicketPayload,
  parseTicketPayload
};
