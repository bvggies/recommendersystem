-- Add paused status and reason fields for trip disruption management
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'paused'));

ALTER TABLE trips ADD COLUMN IF NOT EXISTS status_reason VARCHAR(50);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS status_note TEXT;
