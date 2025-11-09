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

    // Create sample routes
    console.log('\nCreating sample routes...');
    const routes = [
      { origin: 'Nkawkaw', destination: 'Accra', estimated_distance_km: 120, estimated_time_minutes: 150, base_fare: 25.00 },
      { origin: 'Nkawkaw', destination: 'Kumasi', estimated_distance_km: 85, estimated_time_minutes: 120, base_fare: 20.00 },
      { origin: 'Nkawkaw', destination: 'Koforidua', estimated_distance_km: 45, estimated_time_minutes: 60, base_fare: 12.00 },
      { origin: 'Nkawkaw', destination: 'Tema', estimated_distance_km: 135, estimated_time_minutes: 165, base_fare: 28.00 },
      { origin: 'Nkawkaw', destination: 'Cape Coast', estimated_distance_km: 200, estimated_time_minutes: 240, base_fare: 40.00 }
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
      }
    ];

    for (const trip of trips) {
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
      const depTime = new Date(result.rows[0].departure_time).toLocaleString();
      console.log(`  ✓ Created trip: ${trip.origin} → ${trip.destination} (₵${trip.fare}) - ${depTime}`);
    }

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

