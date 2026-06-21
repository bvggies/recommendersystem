const TRIP_STATUS_REASONS = {
  vehicle_breakdown: 'Vehicle breakdown',
  driver_unavailable: 'Driver unavailable',
  weather: 'Weather conditions',
  route_issue: 'Route issue',
  maintenance: 'Scheduled maintenance',
  other: 'Other'
};

const VALID_REASONS = Object.keys(TRIP_STATUS_REASONS);

function formatStatusReason(reason) {
  return TRIP_STATUS_REASONS[reason] || reason || 'Operational issue';
}

function buildStatusMessage(action, trip, reason, note) {
  const route = `${trip.origin} → ${trip.destination}`;
  const reasonLabel = formatStatusReason(reason);
  const noteSuffix = note ? ` Note: ${note}` : '';

  if (action === 'paused') {
    return `Trip ${route} on ${new Date(trip.departure_time).toLocaleString()} has been paused due to ${reasonLabel.toLowerCase()}.${noteSuffix}`;
  }

  return `Trip ${route} on ${new Date(trip.departure_time).toLocaleString()} has been cancelled due to ${reasonLabel.toLowerCase()}.${noteSuffix}`;
}

async function getTripById(pool, tripId) {
  const result = await pool.query('SELECT * FROM trips WHERE id = $1', [tripId]);
  return result.rows[0] || null;
}

async function resolveTripScope(pool, tripId, scope) {
  const trip = await getTripById(pool, tripId);
  if (!trip) {
    return { trip: null, tripIds: [] };
  }

  if (scope !== 'recurring') {
    return { trip, tripIds: [trip.id] };
  }

  const templateId = trip.is_recurring ? trip.id : trip.recurring_schedule?.template_id;

  if (!templateId) {
    return { trip, tripIds: [trip.id] };
  }

  const result = await pool.query(
    `SELECT id FROM trips
     WHERE id = $1
        OR (
          recurring_schedule->>'template_id' = $2
          AND departure_time > NOW()
          AND status IN ('scheduled', 'paused')
        )`,
    [templateId, String(templateId)]
  );

  const tripIds = [...new Set(result.rows.map((row) => row.id))];
  return { trip, tripIds: tripIds.length ? tripIds : [trip.id], templateId };
}

async function notifyTripPassengers(client, tripIds, title, messageBuilder) {
  const bookings = await client.query(
    `SELECT DISTINCT b.passenger_id, t.*
     FROM bookings b
     JOIN trips t ON t.id = b.trip_id
     WHERE b.trip_id = ANY($1::int[])
       AND b.booking_status = 'confirmed'`,
    [tripIds]
  );

  for (const row of bookings.rows) {
    await client.query(
      `INSERT INTO notifications (user_id, notification_type, title, message)
       VALUES ($1, 'trip_alert', $2, $3)`,
      [row.passenger_id, title, messageBuilder(row)]
    );
  }

  return bookings.rows.length;
}

async function cancelTripBookings(client, tripIds, reason, note) {
  const bookings = await client.query(
    `SELECT b.id, b.passenger_id, b.seats_booked, b.trip_id, t.origin, t.destination, t.departure_time
     FROM bookings b
     JOIN trips t ON t.id = b.trip_id
     WHERE b.trip_id = ANY($1::int[])
       AND b.booking_status = 'confirmed'`,
    [tripIds]
  );

  for (const booking of bookings.rows) {
    await client.query(
      `UPDATE bookings SET booking_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [booking.id]
    );

    await client.query(
      `UPDATE trips SET available_seats = available_seats + $1 WHERE id = $2`,
      [booking.seats_booked, booking.trip_id]
    );

    await client.query(
      `INSERT INTO notifications (user_id, notification_type, title, message)
       VALUES ($1, 'trip_alert', 'Trip Cancelled', $2)`,
      [
        booking.passenger_id,
        buildStatusMessage('cancelled', booking, reason, note)
      ]
    );
  }

  return bookings.rows.length;
}

async function pauseTrips(pool, { tripId, scope, reason, note }) {
  if (!VALID_REASONS.includes(reason)) {
    throw new Error('Invalid status reason');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { trip, tripIds } = await resolveTripScope(pool, tripId, scope);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const updateResult = await client.query(
      `UPDATE trips
       SET status = 'paused',
           status_reason = $1,
           status_note = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::int[])
         AND status IN ('scheduled', 'paused')
         AND (is_recurring = true OR departure_time > NOW())
       RETURNING *`,
      [reason, note || null, tripIds]
    );

    const notified = await notifyTripPassengers(
      client,
      updateResult.rows.map((row) => row.id),
      'Trip Paused',
      (row) => buildStatusMessage('paused', row, reason, note)
    );

    await client.query('COMMIT');

    return {
      affected_trips: updateResult.rows.length,
      notified_passengers: notified,
      trips: updateResult.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function resumeTrips(pool, { tripId, scope }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { trip, tripIds, templateId } = await resolveTripScope(pool, tripId, scope);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const updateResult = await client.query(
      `UPDATE trips
       SET status = 'scheduled',
           status_reason = NULL,
           status_note = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::int[])
         AND status = 'paused'
         AND (is_recurring = true OR departure_time > NOW())
       RETURNING *`,
      [tripIds]
    );

    if (scope === 'recurring' && templateId) {
      await client.query(
        `UPDATE trips
         SET status = 'scheduled',
             status_reason = NULL,
             status_note = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_recurring = true AND status = 'paused'`,
        [templateId]
      );
    }

    await client.query('COMMIT');

    return {
      affected_trips: updateResult.rows.length,
      trips: updateResult.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function stopTrips(pool, { tripId, scope, reason, note }) {
  if (!VALID_REASONS.includes(reason)) {
    throw new Error('Invalid status reason');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { trip, tripIds, templateId } = await resolveTripScope(pool, tripId, scope);
    if (!trip) {
      throw new Error('Trip not found');
    }

    const cancellableIds = (
      await client.query(
        `SELECT id FROM trips
         WHERE id = ANY($1::int[])
           AND status IN ('scheduled', 'paused')
           AND (is_recurring = true OR departure_time > NOW())`,
        [tripIds]
      )
    ).rows.map((row) => row.id);

    const cancelledBookings = await cancelTripBookings(client, cancellableIds, reason, note);

    const updateResult = await client.query(
      `UPDATE trips
       SET status = 'cancelled',
           status_reason = $1,
           status_note = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::int[])
         AND status IN ('scheduled', 'paused')
         AND (is_recurring = true OR departure_time > NOW())
       RETURNING *`,
      [reason, note || null, cancellableIds]
    );

    if (scope === 'recurring' && templateId) {
      await client.query(
        `UPDATE trips
         SET status = 'cancelled',
             status_reason = $1,
             status_note = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND is_recurring = true`,
        [reason, note || null, templateId]
      );
    }

    await client.query('COMMIT');

    return {
      affected_trips: updateResult.rows.length,
      cancelled_bookings: cancelledBookings,
      trips: updateResult.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  TRIP_STATUS_REASONS,
  VALID_REASONS,
  formatStatusReason,
  pauseTrips,
  resumeTrips,
  stopTrips,
  resolveTripScope
};
