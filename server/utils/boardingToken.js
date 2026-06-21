const crypto = require('crypto');

function generateBoardingToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildCheckInCode(bookingId, boardingToken) {
  return `NKTS:${bookingId}:${boardingToken}`;
}

function formatTicketDate(dateString) {
  if (!dateString) {
    return 'N/A';
  }

  return new Date(dateString).toLocaleString('en-GH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function buildTicketPayload(bookingId, boardingToken, details = {}) {
  const checkInCode = buildCheckInCode(bookingId, boardingToken);
  const passengerName = details.passenger_name || details.full_name || 'Passenger';
  const origin = details.origin || 'Origin';
  const destination = details.destination || 'Destination';
  const seats = details.seats_booked || 1;
  const vehicleLine = details.vehicle_type
    ? `${details.vehicle_type}${details.registration_number ? ` (${details.registration_number})` : ''}`
    : null;

  const lines = [
    '================================',
    '   NKAWKAW TRANSPORT TICKET',
    '================================',
    '',
    `Booking:   #${bookingId}`,
    '',
    'PASSENGER',
    `Name:      ${passengerName}`,
    details.phone ? `Phone:     ${details.phone}` : null,
    details.email ? `Email:     ${details.email}` : null,
    '',
    'TRIP',
    `Route:     ${origin}  →  ${destination}`,
    `Departs:   ${formatTicketDate(details.departure_time)}`,
    `Seats:     ${seats}`,
    '',
    'OPERATOR',
    `Driver:    ${details.driver_name || 'Assigned at station'}`,
    vehicleLine ? `Vehicle:   ${vehicleLine}` : null,
    details.payment_reference ? `Payment:   ${details.payment_reference}` : null,
    '',
    '--------------------------------',
    'Show this QR at the station',
    '',
    'CHECK-IN CODE:',
    checkInCode,
    '================================'
  ].filter(Boolean);

  return lines.join('\n');
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
    // Not JSON — continue with plain-text parsing
  }

  const embeddedMatch = trimmed.match(/NKTS:(\d+):([a-f0-9]+)/i);
  if (embeddedMatch) {
    return {
      bookingId: parseInt(embeddedMatch[1], 10),
      boardingToken: embeddedMatch[2]
    };
  }

  return null;
}

module.exports = {
  generateBoardingToken,
  buildCheckInCode,
  buildTicketPayload,
  parseTicketPayload,
  formatTicketDate
};
