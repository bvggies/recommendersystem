const crypto = require('crypto');

function generateBoardingToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildTicketPayload(bookingId, boardingToken) {
  return `NKTS:${bookingId}:${boardingToken}`;
}

function parseTicketPayload(payload) {
  if (!payload) return null;

  const trimmed = String(payload).trim();
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
