const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ALL_DAYS,
  buildRecurringSchedule,
  extractTimeFromDeparture,
  formatRecurringLabel,
  getDatesForSchedule
} = require('../utils/recurringTrips');

test('extractTimeFromDeparture returns HH:MM', () => {
  assert.equal(extractTimeFromDeparture('2026-06-21T08:30:00'), '08:30');
});

test('buildRecurringSchedule normalizes days of week', () => {
  const schedule = buildRecurringSchedule('2026-06-21T14:15:00', [1, 1, 5, 9]);

  assert.equal(schedule.time, '14:15');
  assert.deepEqual(schedule.days_of_week, [1, 5]);
});

test('formatRecurringLabel describes daily schedules', () => {
  const label = formatRecurringLabel({ time: '07:00', days_of_week: ALL_DAYS });
  assert.match(label, /Daily at 07:00/);
});

test('getDatesForSchedule skips past departures', () => {
  const schedule = { time: '23:59', days_of_week: ALL_DAYS };
  const fromDate = new Date('2026-01-01T00:00:00');

  const dates = getDatesForSchedule(schedule, 0, fromDate);
  assert.equal(dates.length, 0);
});

test('getDatesForSchedule respects selected weekdays', () => {
  const schedule = { time: '10:00', days_of_week: [1] };
  const fromDate = new Date('2027-06-07T00:00:00'); // Monday

  const dates = getDatesForSchedule(schedule, 6, fromDate);
  assert.equal(dates.length, 1);
  assert.equal(dates[0].dateStr, '2027-06-07');
  assert.equal(dates[0].departureDateTime, '2027-06-07T10:00:00');
});
