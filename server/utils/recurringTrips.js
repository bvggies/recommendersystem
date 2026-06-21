const DEFAULT_DAYS_AHEAD = 14;

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function extractTimeFromDeparture(departureTime) {
  const date = new Date(departureTime);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildRecurringSchedule(departureTime, daysOfWeek = ALL_DAYS) {
  const normalizedDays = [...new Set(daysOfWeek.map(Number))]
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);

  return {
    time: extractTimeFromDeparture(departureTime),
    days_of_week: normalizedDays.length ? normalizedDays : ALL_DAYS
  };
}

function formatRecurringLabel(schedule) {
  if (!schedule) return 'Daily';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = schedule.days_of_week || ALL_DAYS;

  if (days.length === 7) {
    return `Daily at ${schedule.time || 'scheduled time'}`;
  }

  const labels = days.map((day) => dayNames[day]).join(', ');
  return `${labels} at ${schedule.time || 'scheduled time'}`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatesForSchedule(schedule, daysAhead, fromDate = new Date()) {
  const time = schedule.time || '00:00';
  const daysOfWeek = schedule.days_of_week || ALL_DAYS;
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const dates = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);

    if (!daysOfWeek.includes(date.getDay())) {
      continue;
    }

    const dateStr = formatLocalDate(date);
    const departureDateTime = `${dateStr}T${time}:00`;

    if (new Date(departureDateTime) <= new Date()) {
      continue;
    }

    dates.push({ dateStr, departureDateTime });
  }

  return dates;
}

async function materializeRecurringInstances(pool, daysAhead = DEFAULT_DAYS_AHEAD) {
  const templates = await pool.query(
    `SELECT * FROM trips WHERE is_recurring = true AND status = 'scheduled'`
  );

  let created = 0;

  for (const template of templates.rows) {
    const schedule = typeof template.recurring_schedule === 'string'
      ? JSON.parse(template.recurring_schedule)
      : (template.recurring_schedule || buildRecurringSchedule(template.departure_time));

    const dates = getDatesForSchedule(schedule, daysAhead);

    for (const { dateStr, departureDateTime } of dates) {
      const existing = await pool.query(
        `SELECT id FROM trips
         WHERE is_recurring = false
           AND recurring_schedule->>'template_id' = $1
           AND DATE(departure_time) = $2::date`,
        [String(template.id), dateStr]
      );

      if (existing.rows.length > 0) {
        continue;
      }

      await pool.query(
        `INSERT INTO trips (
           driver_id, vehicle_id, route_id, origin, destination, fare,
           departure_time, total_seats, available_seats, is_recurring, recurring_schedule, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, false, $9, 'scheduled')`,
        [
          template.driver_id,
          template.vehicle_id,
          template.route_id,
          template.origin,
          template.destination,
          template.fare,
          departureDateTime,
          template.total_seats,
          JSON.stringify({ template_id: template.id, generated_date: dateStr })
        ]
      );

      created += 1;
    }
  }

  return created;
}

async function deleteFutureGeneratedInstances(pool, templateId) {
  await pool.query(
    `DELETE FROM trips
     WHERE recurring_schedule->>'template_id' = $1
       AND departure_time > NOW()
       AND is_recurring = false
       AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.trip_id = trips.id AND b.booking_status != 'cancelled'
       )`,
    [String(templateId)]
  );
}

module.exports = {
  ALL_DAYS,
  DEFAULT_DAYS_AHEAD,
  buildRecurringSchedule,
  extractTimeFromDeparture,
  formatRecurringLabel,
  getDatesForSchedule,
  materializeRecurringInstances,
  deleteFutureGeneratedInstances
};
