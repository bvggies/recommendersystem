const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const router = express.Router();

// This endpoint should be protected or removed after seeding
// For security, you might want to add authentication
router.post('/run', async (req, res) => {
  try {
    // Check for a secret key to prevent unauthorized access
    const secretKey = req.body.secret_key || req.headers['x-seed-key'];
    if (secretKey !== process.env.SEED_SECRET_KEY) {
      return res.status(403).json({ error: 'Unauthorized. Secret key required.' });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('🌱 Starting database seeding via API...\n');

    // Import and run the seed function
    // We'll inline a simplified version here
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Create drivers (if they don't exist)
    const drivers = [
      { username: 'driver1', email: 'driver1@nkawkaw.com', phone: '+233241234567', full_name: 'Kwame Mensah', role: 'driver' },
      { username: 'driver2', email: 'driver2@nkawkaw.com', phone: '+233241234568', full_name: 'Ama Asante', role: 'driver' },
      { username: 'driver3', email: 'driver3@nkawkaw.com', phone: '+233241234569', full_name: 'Kofi Boateng', role: 'driver' }
    ];

    const driverIds = [];
    for (const driver of drivers) {
      const result = await pool.query(
        `INSERT INTO users (username, email, phone, full_name, role, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [driver.username, driver.email, driver.phone, driver.full_name, driver.role, passwordHash]
      );
      driverIds.push(result.rows[0].id);
    }

    // Get existing vehicles or create them
    const vehicleResult = await pool.query('SELECT id, driver_id FROM vehicles LIMIT 5');
    let vehicleIds = vehicleResult.rows.map(v => v.id);
    
    if (vehicleIds.length === 0) {
      // Create vehicles if none exist
      const vehicles = [
        { driver_id: driverIds[0], vehicle_type: 'VIP', registration_number: 'GR-1234-20', comfort_level: 'VIP', capacity: 15 },
        { driver_id: driverIds[0], vehicle_type: 'bus', registration_number: 'GR-5678-20', comfort_level: 'air-conditioned', capacity: 30 },
        { driver_id: driverIds[1], vehicle_type: 'minibus', registration_number: 'GR-9012-20', comfort_level: 'standard', capacity: 18 },
        { driver_id: driverIds[1], vehicle_type: 'taxi', registration_number: 'GR-3456-20', comfort_level: 'air-conditioned', capacity: 4 },
        { driver_id: driverIds[2], vehicle_type: 'bus', registration_number: 'GR-7890-20', comfort_level: 'standard', capacity: 25 }
      ];

      for (const vehicle of vehicles) {
        const result = await pool.query(
          `INSERT INTO vehicles (driver_id, vehicle_type, registration_number, comfort_level, capacity)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (registration_number) DO UPDATE SET vehicle_type = EXCLUDED.vehicle_type
           RETURNING id`,
          [vehicle.driver_id, vehicle.vehicle_type, vehicle.registration_number, vehicle.comfort_level, vehicle.capacity]
        );
        vehicleIds.push(result.rows[0].id);
      }
    }

    // Get or create routes
    const routes = [
      { origin: 'Nkawkaw', destination: 'Accra', estimated_distance_km: 120, estimated_time_minutes: 150, base_fare: 25.00 },
      { origin: 'Nkawkaw', destination: 'Kumasi', estimated_distance_km: 85, estimated_time_minutes: 120, base_fare: 20.00 },
      { origin: 'Nkawkaw', destination: 'Koforidua', estimated_distance_km: 45, estimated_time_minutes: 60, base_fare: 12.00 },
      { origin: 'Nkawkaw', destination: 'Tema', estimated_distance_km: 135, estimated_time_minutes: 165, base_fare: 28.00 },
      { origin: 'Nkawkaw', destination: 'Cape Coast', estimated_distance_km: 200, estimated_time_minutes: 240, base_fare: 40.00 },
      { origin: 'Nkawkaw', destination: 'Takoradi', estimated_distance_km: 250, estimated_time_minutes: 300, base_fare: 50.00 },
      { origin: 'Nkawkaw', destination: 'Sunyani', estimated_distance_km: 180, estimated_time_minutes: 220, base_fare: 35.00 },
      { origin: 'Accra', destination: 'Nkawkaw', estimated_distance_km: 120, estimated_time_minutes: 150, base_fare: 25.00 },
      { origin: 'Kumasi', destination: 'Nkawkaw', estimated_distance_km: 85, estimated_time_minutes: 120, base_fare: 20.00 },
      { origin: 'Koforidua', destination: 'Nkawkaw', estimated_distance_km: 45, estimated_time_minutes: 60, base_fare: 12.00 },
      { origin: 'Tema', destination: 'Nkawkaw', estimated_distance_km: 135, estimated_time_minutes: 165, base_fare: 28.00 },
      { origin: 'Cape Coast', destination: 'Nkawkaw', estimated_distance_km: 200, estimated_time_minutes: 240, base_fare: 40.00 },
      { origin: 'Takoradi', destination: 'Nkawkaw', estimated_distance_km: 250, estimated_time_minutes: 300, base_fare: 50.00 },
      { origin: 'Sunyani', destination: 'Nkawkaw', estimated_distance_km: 180, estimated_time_minutes: 220, base_fare: 35.00 }
    ];

    const routeIds = [];
    for (const route of routes) {
      const result = await pool.query(
        `INSERT INTO routes (origin, destination, estimated_distance_km, estimated_time_minutes, base_fare)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (origin, destination) DO UPDATE SET base_fare = EXCLUDED.base_fare
         RETURNING id`,
        [route.origin, route.destination, route.estimated_distance_km, route.estimated_time_minutes, route.base_fare]
      );
      routeIds.push(result.rows[0].id);
    }

    // Generate trips for this month and next month
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const generateTripsForMonth = (startDate, daysInMonth) => {
      const trips = [];
      const destinations = ['Accra', 'Kumasi', 'Koforidua', 'Tema', 'Cape Coast', 'Takoradi', 'Sunyani'];
      const origins = ['Accra', 'Kumasi', 'Koforidua', 'Tema', 'Cape Coast', 'Takoradi', 'Sunyani'];
      const fares = {
        'Accra': 30.00, 'Kumasi': 22.00, 'Koforidua': 15.00, 'Tema': 32.00,
        'Cape Coast': 45.00, 'Takoradi': 55.00, 'Sunyani': 40.00
      };
      
      for (let day = 0; day < daysInMonth; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        
        // Departures from Nkawkaw
        const departureTimes = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
        const departureCount = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < departureCount; i++) {
          const dest = destinations[Math.floor(Math.random() * destinations.length)];
          const hour = departureTimes[Math.floor(Math.random() * departureTimes.length)];
          const minute = Math.floor(Math.random() * 4) * 15;
          
          const departureTime = new Date(currentDate);
          departureTime.setHours(hour, minute, 0, 0);
          
          if (departureTime > now) {
            const driverIdx = Math.floor(Math.random() * driverIds.length);
            const vehicleIdx = Math.floor(Math.random() * vehicleIds.length);
            const routeIdx = routes.findIndex(r => r.origin === 'Nkawkaw' && r.destination === dest);
            
            if (routeIdx >= 0) {
              const totalSeats = [15, 18, 25, 30, 4][Math.floor(Math.random() * 5)];
              const availableSeats = Math.floor(Math.random() * totalSeats);
              
              trips.push({
                driver_id: driverIds[driverIdx],
                vehicle_id: vehicleIds[vehicleIdx],
                route_id: routeIds[routeIdx],
                origin: 'Nkawkaw',
                destination: dest,
                fare: fares[dest] || 25.00,
                departure_time: departureTime,
                total_seats: totalSeats,
                available_seats: availableSeats,
                status: 'scheduled'
              });
            }
          }
        }
        
        // Arrivals to Nkawkaw
        const arrivalTimes = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const arrivalCount = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < arrivalCount; i++) {
          const orig = origins[Math.floor(Math.random() * origins.length)];
          const hour = arrivalTimes[Math.floor(Math.random() * arrivalTimes.length)];
          const minute = Math.floor(Math.random() * 4) * 15;
          
          const arrivalTime = new Date(currentDate);
          arrivalTime.setHours(hour, minute, 0, 0);
          
          if (arrivalTime > now) {
            const driverIdx = Math.floor(Math.random() * driverIds.length);
            const vehicleIdx = Math.floor(Math.random() * vehicleIds.length);
            const routeIdx = routes.findIndex(r => r.origin === orig && r.destination === 'Nkawkaw');
            
            if (routeIdx >= 0) {
              const totalSeats = [15, 18, 25, 30, 4][Math.floor(Math.random() * 5)];
              const availableSeats = Math.floor(Math.random() * totalSeats);
              
              trips.push({
                driver_id: driverIds[driverIdx],
                vehicle_id: vehicleIds[vehicleIdx],
                route_id: routeIds[routeIdx],
                origin: orig,
                destination: 'Nkawkaw',
                fare: fares[orig] || 25.00,
                departure_time: arrivalTime,
                total_seats: totalSeats,
                available_seats: availableSeats,
                status: 'scheduled'
              });
            }
          }
        }
      }
      
      return trips;
    };
    
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    const remainingDaysThisMonth = daysInCurrentMonth - currentDay + 1;
    
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const nextMonthStart = new Date(nextYear, nextMonth, 1);
    
    const tripsThisMonth = generateTripsForMonth(today, remainingDaysThisMonth);
    const tripsNextMonth = generateTripsForMonth(nextMonthStart, daysInNextMonth);
    const allTrips = [...tripsThisMonth, ...tripsNextMonth];
    
    // Insert trips
    let insertedCount = 0;
    for (const trip of allTrips) {
      try {
        await pool.query(
          `INSERT INTO trips (driver_id, vehicle_id, route_id, origin, destination, fare, departure_time, total_seats, available_seats, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            trip.driver_id, trip.vehicle_id, trip.route_id, trip.origin, trip.destination,
            trip.fare, trip.departure_time, trip.total_seats, trip.available_seats, trip.status
          ]
        );
        insertedCount++;
      } catch (error) {
        console.error('Failed to insert trip:', error.message);
      }
    }

    await pool.end();

    res.json({
      success: true,
      message: 'Database seeded successfully',
      stats: {
        drivers: driverIds.length,
        vehicles: vehicleIds.length,
        routes: routeIds.length,
        trips: insertedCount,
        tripsThisMonth: tripsThisMonth.length,
        tripsNextMonth: tripsNextMonth.length
      }
    });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed database', details: error.message });
  }
});

module.exports = router;

