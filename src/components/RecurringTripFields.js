import React from 'react';

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' }
];

const RecurringTripFields = ({
  isRecurring,
  recurringDays,
  onRecurringToggle,
  onDayToggle
}) => {
  return (
    <div className="recurring-fields">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={onRecurringToggle}
        />
        <span>Recurring trip — repeats at this time on selected days</span>
      </label>

      {isRecurring && (
        <div className="recurring-days">
          <p className="recurring-help">
            Pick the days this trip runs. Passengers see individual scheduled departures.
          </p>
          <div className="day-toggle-group">
            {WEEKDAYS.map((day) => (
              <label key={day.value} className="day-toggle">
                <input
                  type="checkbox"
                  checked={recurringDays.includes(day.value)}
                  onChange={() => onDayToggle(day.value)}
                />
                <span>{day.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ALL_RECURRING_DAYS = WEEKDAYS.map((day) => day.value);

export default RecurringTripFields;
