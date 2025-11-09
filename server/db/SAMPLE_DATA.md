# Sample Data Documentation

## 📊 Sample Data Overview

The database has been seeded with sample data to help you test the application.

### Sample Drivers (3)

1. **Kwame Mensah** (driver1)
   - Email: driver1@nkawkaw.com
   - Phone: +233241234567
   - Vehicles: VIP bus (GR-1234-20), Regular bus (GR-5678-20)

2. **Ama Asante** (driver2)
   - Email: driver2@nkawkaw.com
   - Phone: +233241234568
   - Vehicles: Minibus (GR-9012-20), Taxi (GR-3456-20)

3. **Kofi Boateng** (driver3)
   - Email: driver3@nkawkaw.com
   - Phone: +233241234569
   - Vehicles: Regular bus (GR-7890-20)

**Test Credentials:**
- Username: `driver1`, `driver2`, or `driver3`
- Password: `password123`

### Sample Routes (5)

1. **Nkawkaw → Accra**
   - Distance: 120 km
   - Estimated Time: 150 minutes
   - Base Fare: ₵25.00

2. **Nkawkaw → Kumasi**
   - Distance: 85 km
   - Estimated Time: 120 minutes
   - Base Fare: ₵20.00

3. **Nkawkaw → Koforidua**
   - Distance: 45 km
   - Estimated Time: 60 minutes
   - Base Fare: ₵12.00

4. **Nkawkaw → Tema**
   - Distance: 135 km
   - Estimated Time: 165 minutes
   - Base Fare: ₵28.00

5. **Nkawkaw → Cape Coast**
   - Distance: 200 km
   - Estimated Time: 240 minutes
   - Base Fare: ₵40.00

### Sample Trips (10)

#### Today's Trips

1. **Nkawkaw → Accra** (VIP)
   - Driver: Kwame Mensah
   - Departure: 8:00 AM
   - Fare: ₵30.00
   - Seats: 8/15 available

2. **Nkawkaw → Accra** (VIP)
   - Driver: Kwame Mensah
   - Departure: 2:00 PM
   - Fare: ₵30.00
   - Seats: 12/15 available

3. **Nkawkaw → Kumasi** (Minibus)
   - Driver: Ama Asante
   - Departure: 9:00 AM
   - Fare: ₵22.00
   - Seats: 5/18 available

4. **Nkawkaw → Koforidua** (Bus)
   - Driver: Kofi Boateng
   - Departure: 10:00 AM
   - Fare: ₵15.00
   - Seats: 20/25 available

#### Tomorrow's Trips

5. **Nkawkaw → Accra** (Bus)
   - Driver: Kwame Mensah
   - Departure: 7:00 AM
   - Fare: ₵28.00
   - Seats: 30/30 available

6. **Nkawkaw → Tema** (Taxi)
   - Driver: Ama Asante
   - Departure: 11:00 AM
   - Fare: ₵32.00
   - Seats: 2/4 available

7. **Nkawkaw → Kumasi** (Bus)
   - Driver: Kofi Boateng
   - Departure: 1:00 PM
   - Fare: ₵20.00
   - Seats: 18/25 available

#### Day After Tomorrow's Trips

8. **Nkawkaw → Cape Coast** (VIP)
   - Driver: Kwame Mensah
   - Departure: 6:00 AM
   - Fare: ₵45.00
   - Seats: 15/15 available

9. **Nkawkaw → Koforidua** (Minibus)
   - Driver: Ama Asante
   - Departure: 3:00 PM
   - Fare: ₵12.00
   - Seats: 10/18 available

10. **Nkawkaw → Accra** (Bus)
    - Driver: Kofi Boateng
    - Departure: 4:00 PM
    - Fare: ₵25.00
    - Seats: 25/25 available

## 🔄 Re-seeding the Database

To add the sample data again (useful if you cleared the database):

```bash
cd server
npm run seed
```

Or directly:

```bash
cd server
node db/seed-data.js
```

## 🧪 Testing the Application

### As a Passenger:

1. **Register/Login** as a passenger
2. **Browse Trips** - You'll see all 10 sample trips
3. **Search** - Try searching for "Accra" or "Kumasi"
4. **Filter** - Filter by fare range, vehicle type, etc.
5. **View Recommendations** - See AI-powered recommendations
6. **Book a Trip** - Book any available trip

### As a Driver:

1. **Login** with one of the driver accounts:
   - Username: `driver1`, `driver2`, or `driver3`
   - Password: `password123`
2. **View My Trips** - See trips you've created
3. **Create New Trip** - Add more trips
4. **Manage Trips** - Edit or delete your trips

## 📝 Notes

- All sample trips are set to "scheduled" status
- Departure times are set relative to today's date
- Sample data uses realistic Ghanaian locations and pricing
- You can modify the seed script to add more data

## 🗑️ Clearing Sample Data

To remove all sample data:

```sql
-- Delete all trips
DELETE FROM trips;

-- Delete all vehicles
DELETE FROM vehicles;

-- Delete all routes
DELETE FROM routes;

-- Delete all drivers (be careful - this will delete all users with driver role)
DELETE FROM users WHERE role = 'driver';
```

Or use the Neon console SQL editor to run these commands.

