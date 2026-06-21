async function notifyTripPassengers(client, tripId, title, message) {
  const passengers = await client.query(
    `SELECT DISTINCT b.passenger_id
     FROM bookings b
     WHERE b.trip_id = $1
       AND b.booking_status IN ('confirmed', 'pending')
       AND b.payment_status IN ('paid', 'pending')`,
    [tripId]
  );

  for (const row of passengers.rows) {
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, title, message)
       VALUES ($1, 'trip_alert', $2, $3)`,
      [row.passenger_id, title, message]
    );
  }

  return passengers.rows.length;
}

module.exports = { notifyTripPassengers };
