const { generateBoardingToken } = require('./boardingToken');

async function ensureBoardingToken(client, bookingId) {
  const existing = await client.query(
    'SELECT boarding_token FROM bookings WHERE id = $1',
    [bookingId]
  );

  if (existing.rows[0]?.boarding_token) {
    return existing.rows[0].boarding_token;
  }

  const token = generateBoardingToken();
  await client.query(
    `UPDATE bookings
     SET boarding_token = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [token, bookingId]
  );

  return token;
}

module.exports = { ensureBoardingToken };
