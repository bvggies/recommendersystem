-- Live tracking & delay alerts
ALTER TABLE trips ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS delay_reason TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS last_latitude DECIMAL(10, 8);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS last_longitude DECIMAL(11, 8);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tracking_active BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS trip_location_updates (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2),
    speed_kmh DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trip_location_updates_trip ON trip_location_updates(trip_id, recorded_at DESC);

-- QR boarding tickets
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS boarding_token VARCHAR(64) UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_boarding_token ON bookings(boarding_token);
