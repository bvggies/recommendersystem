async function expirePastScheduledTrips(pool) {
  const result = await pool.query(
    `UPDATE trips
     SET status = 'completed',
         updated_at = CURRENT_TIMESTAMP
     WHERE status = 'scheduled'
       AND departure_time <= NOW()
       AND COALESCE(tracking_active, false) = false`
  );

  return result.rowCount;
}

module.exports = { expirePastScheduledTrips };
