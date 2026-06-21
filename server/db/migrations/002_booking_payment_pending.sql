-- Support pending bookings until payment completes
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check
  CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed'));
