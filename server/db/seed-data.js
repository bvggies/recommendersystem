const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Create sample drivers
    console.log('Creating sample drivers...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const drivers = [
      {
        username: 'driver1',
        email: 'driver1@nkawkaw.com',
        phone: '+233241234567',
        full_name: 'Kwame Mensah',
        role: 'driver',
        password_hash: passwordHash
      },
      {
        username: 'driver2',
        email: 'driver2@nkawkaw.com',
        phone: '+233241234568',
        full_name: 'Ama Asante',
        role: 'driver',
        password_hash: passwordHash
      },
      {
        username: 'driver3',
        email: 'driver3@nkawkaw.com',
        phone: '+233241234569',
        full_name: 'Kofi Boateng',
        role: 'driver',
        password_hash: passwordHash
      }
    ];

    const driverIds = [];
    for (const driver of drivers) {
      const result = await pool.query(
        `INSERT INTO users (username, email, phone, full_name, role, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [driver.username, driver.email, driver.phone, driver.full_name, driver.role, driver.password_hash]
      );
      driverIds.push(result.rows[0].id);
      console.log(`  ✓ Created driver: ${driver.full_name} (ID: ${result.rows[0].id})`);
    }

    // Create sample vehicles
    console.log('\nCreating sample vehicles...');
    const vehicles = [
      {
        driver_id: driverIds[0],
        vehicle_type: 'VIP',
        registration_number: 'GR-1234-20',
        comfort_level: 'VIP',
        capacity: 15
      },
      {
        driver_id: driverIds[0],
        vehicle_type: 'bus',
        registration_number: 'GR-5678-20',
        comfort_level: 'air-conditioned',
        capacity: 30
      },
      {
        driver_id: driverIds[1],
        vehicle_type: 'minibus',
        registration_number: 'GR-9012-20',
        comfort_level: 'standard',
        capacity: 18
      },
      {
        driver_id: driverIds[1],
        vehicle_type: 'taxi',
        registration_number: 'GR-3456-20',
        comfort_level: 'air-conditioned',
        capacity: 4
      },
      {
        driver_id: driverIds[2],
        vehicle_type: 'bus',
        registration_number: 'GR-7890-20',
        comfort_level: 'standard',
        capacity: 25
      }
    ];

    const vehicleIds = [];
    for (const vehicle of vehicles) {
      const result = await pool.query(
        `INSERT INTO vehicles (driver_id, vehicle_type, registration_number, comfort_level, capacity)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (registration_number) DO UPDATE SET vehicle_type = EXCLUDED.vehicle_type
         RETURNING id`,
        [vehicle.driver_id, vehicle.vehicle_type, vehicle.registration_number, vehicle.comfort_level, vehicle.capacity]
      );
      vehicleIds.push(result.rows[0].id);
      console.log(`  ✓ Created vehicle: ${vehicle.registration_number} (${vehicle.vehicle_type})`);
    }

    // Create sample routes (including reverse routes for arrivals)
    console.log('\nCreating sample routes...');
    const routes = [
      // Departures from Nkawkaw
      { origin: 'Nkawkaw', destination: 'Accra', estimated_distance_km: 120, estimated_time_minutes: 150, base_fare: 25.00 },
      { origin: 'Nkawkaw', destination: 'Kumasi', estimated_distance_km: 85, estimated_time_minutes: 120, base_fare: 20.00 },
      { origin: 'Nkawkaw', destination: 'Koforidua', estimated_distance_km: 45, estimated_time_minutes: 60, base_fare: 12.00 },
      { origin: 'Nkawkaw', destination: 'Tema', estimated_distance_km: 135, estimated_time_minutes: 165, base_fare: 28.00 },
      { origin: 'Nkawkaw', destination: 'Cape Coast', estimated_distance_km: 200, estimated_time_minutes: 240, base_fare: 40.00 },
      { origin: 'Nkawkaw', destination: 'Takoradi', estimated_distance_km: 250, estimated_time_minutes: 300, base_fare: 50.00 },
      { origin: 'Nkawkaw', destination: 'Sunyani', estimated_distance_km: 180, estimated_time_minutes: 220, base_fare: 35.00 },
      // Arrivals to Nkawkaw (reverse routes)
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
      console.log(`  ✓ Created route: ${route.origin} → ${route.destination}`);
    }

    // Create sample trips
    console.log('\nCreating sample trips...');
    
    // Helper to create dates
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Helper function to generate trips for a date range
    const generateTripsForMonth = (startDate, daysInMonth) => {
      const trips = [];
      const destinations = ['Accra', 'Kumasi', 'Koforidua', 'Tema', 'Cape Coast', 'Takoradi', 'Sunyani'];
      const origins = ['Accra', 'Kumasi', 'Koforidua', 'Tema', 'Cape Coast', 'Takoradi', 'Sunyani'];
      const fares = {
        'Accra': 30.00,
        'Kumasi': 22.00,
        'Koforidua': 15.00,
        'Tema': 32.00,
        'Cape Coast': 45.00,
        'Takoradi': 55.00,
        'Sunyani': 40.00
      };
      
      // Generate multiple trips per day
      for (let day = 0; day < daysInMonth; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        
        // Departures from Nkawkaw (multiple times per day)
        const departureTimes = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
        const departureCount = Math.floor(Math.random() * 5) + 3; // 3-7 departures per day
        
        for (let i = 0; i < departureCount; i++) {
          const dest = destinations[Math.floor(Math.random() * destinations.length)];
          const hour = departureTimes[Math.floor(Math.random() * departureTimes.length)];
          const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
          
          const departureTime = new Date(currentDate);
          departureTime.setHours(hour, minute, 0, 0);
          
          // Only add future trips
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
        
        // Arrivals to Nkawkaw (multiple times per day)
        const arrivalTimes = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const arrivalCount = Math.floor(Math.random() * 5) + 3; // 3-7 arrivals per day
        
        for (let i = 0; i < arrivalCount; i++) {
          const orig = origins[Math.floor(Math.random() * origins.length)];
          const hour = arrivalTimes[Math.floor(Math.random() * arrivalTimes.length)];
          const minute = Math.floor(Math.random() * 4) * 15;
          
          const arrivalTime = new Date(currentDate);
          arrivalTime.setHours(hour, minute, 0, 0);
          
          // Only add future trips
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
    
    // Generate trips for this month (remaining days)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    const remainingDaysThisMonth = daysInCurrentMonth - currentDay + 1;
    
    // Generate trips for next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const nextMonthStart = new Date(nextYear, nextMonth, 1);
    
    const tripsThisMonth = generateTripsForMonth(today, remainingDaysThisMonth);
    const tripsNextMonth = generateTripsForMonth(nextMonthStart, daysInNextMonth);
    
    console.log(`  📅 Generated ${tripsThisMonth.length} trips for remaining ${remainingDaysThisMonth} days of this month`);
    console.log(`  📅 Generated ${tripsNextMonth.length} trips for ${daysInNextMonth} days of next month`);
    
    // Combine with existing trips
    const trips = [
      // Today's trips
      {
        driver_id: driverIds[0],
        vehicle_id: vehicleIds[0],
        route_id: routeIds[0],
        origin: 'Nkawkaw',
        destination: 'Accra',
        fare: 30.00,
        departure_time: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 AM today
        total_seats: 15,
        available_seats: 8,
        status: 'scheduled'
      },
      {
        driver_id: driverIds[0],
        vehicle_id: vehicleIds[0],
        route_id: routeIds[0],
        origin: 'Nkawkaw',
        destination: 'Accra',
        fare: 30.00,
        departure_time: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM today
        total_seats: 15,
        available_seats: 12,
        status: 'scheduled'
      },
      {
        driver_id: driverIds[1],
        vehicle_id: vehicleIds[2],
        route_id: routeIds[1],
        origin: 'Nkawkaw',
        destination: 'Kumasi',
        fare: 22.00,
        departure_time: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM today
        total_seats: 18,
        available_seats: 5,
        status: 'scheduled'
      },
      {
        driver_id: driverIds[2],
        vehicle_id: vehicleIds[4],
        route_id: routeIds[2],
        origin: 'Nkawkaw',
        destination: 'Koforidua',
        fare: 15.00,
        departure_time: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10 AM today
        total_seats: 25,
        available_seats: 20,
        status: 'scheduled'
      },
      // Tomorrow's trips
      {
        driver_id: driverIds[0],
        vehicle_id: vehicleIds[1],
        route_id: routeIds[0],
        origin: 'Nkawkaw',
        destination: 'Accra',
        fare: 28.00,
        departure_time: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000), // 7 AM tomorrow
        total_seats: 30,
        available_seats: 30,
        status: 'scheduled'
      },
      {
        driver_id: driverIds[1],
        vehicle_id: vehicleIds[3],
        route_id: routeIds[3],
        origin: 'Nkawkaw',
        destination: 'Tema',
        fare: 32.00,
        departure_time: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000), // 11 AM tomorrow
        total_seats: 4,
        available_seats: 2,
        status: 'scheduled'
      },
      {
        driver_id: driverIds[2],
        vehicle_id: vehicleIds[4],
        route_id: routeIds[1],
        origin: 'Nkawkaw',
        destination: 'Kumasi',
        fare: 20.00,
        departure_time: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000), // 1 PM tomorrow
        total_seats: 25,
        available_seats: 18,
        status: 'scheduled'
      },
      // Day after tomorrow
      {
        driver_id: driverIds[0],
        vehicle_id: vehicleIds[0],
        route_id: routeIds[4],
        origin: 'Nkawkaw',
        destination: 'Cape Coast',
        fare: 45.00,
        departure_time: new Date(today.getTime() + 48 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 AM day after tomorrow
        total_seats: 15,
        available_seats: 15,
        status: 'scheduled'
      },
      {
        driver_id: driverIds[1],
        vehicle_id: vehicleIds[2],
        route_id: routeIds[2],
        origin: 'Nkawkaw',
        destination: 'Koforidua',
        fare: 12.00,
        departure_time: new Date(today.getTime() + 48 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 3 PM day after tomorrow
        total_seats: 18,
        available_seats: 10,
        status: 'scheduled'
      },
      {
        driver_id: driverIds[2],
        vehicle_id: vehicleIds[4],
        route_id: routeIds[0],
        origin: 'Nkawkaw',
        destination: 'Accra',
        fare: 25.00,
        departure_time: new Date(today.getTime() + 48 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // 4 PM day after tomorrow
        total_seats: 25,
        available_seats: 25,
        status: 'scheduled'
      },
      // Add generated trips for this month and next month
      ...tripsThisMonth,
      ...tripsNextMonth
    ];

    // Insert trips in batches for better performance
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < trips.length; i += batchSize) {
      const batch = trips.slice(i, i + batchSize);
      
      for (const trip of batch) {
        try {
          const result = await pool.query(
            `INSERT INTO trips (driver_id, vehicle_id, route_id, origin, destination, fare, departure_time, total_seats, available_seats, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, departure_time`,
            [
              trip.driver_id,
              trip.vehicle_id,
              trip.route_id,
              trip.origin,
              trip.destination,
              trip.fare,
              trip.departure_time,
              trip.total_seats,
              trip.available_seats,
              trip.status
            ]
          );
          
          if (result.rows.length > 0) {
            insertedCount++;
            // Only log first few and last few trips to avoid console spam
            if (insertedCount <= 5 || insertedCount > trips.length - 5) {
              const depTime = new Date(result.rows[0].departure_time).toLocaleString();
              console.log(`  ✓ Created trip: ${trip.origin} → ${trip.destination} (₵${trip.fare}) - ${depTime}`);
            }
          }
        } catch (error) {
          console.error(`  ✗ Failed to create trip: ${trip.origin} → ${trip.destination}`, error.message);
        }
      }
      
      // Progress indicator for large batches
      if (trips.length > 100 && (i + batchSize) % 100 === 0) {
        console.log(`  📊 Progress: ${Math.min(i + batchSize, trips.length)}/${trips.length} trips processed...`);
      }
    }
    
    console.log(`  ✅ Successfully inserted ${insertedCount} trips`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Sample Data Summary:');
    console.log(`   - ${drivers.length} drivers created`);
    console.log(`   - ${vehicles.length} vehicles created`);
    console.log(`   - ${routes.length} routes created`);
    console.log(`   - ${trips.length} trips created`);
    console.log('\n🔑 Test Credentials:');
    console.log('   Username: driver1, driver2, or driver3');
    console.log('   Password: password123');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('✨ Seeding process finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });

