# How to Seed the Database with Arrivals and Departures Data

## Option 1: Run Locally (Recommended) ⭐

Since your database is hosted on Neon PostgreSQL, you can run the seed script from your local machine and it will populate the remote database.

### Steps:

1. **Open your terminal/command prompt**

2. **Navigate to the server directory:**
   ```bash
   cd server
   ```

3. **Make sure you have a `.env` file** in the `server` directory with your `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_mBj4hKdTL7UJ@ep-floral-bread-adfo7kp9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

4. **Run the seed script:**
   ```bash
   npm run seed
   ```

   This will:
   - Create sample drivers, vehicles, and routes
   - Generate hundreds of trips for the remaining days of this month
   - Generate hundreds of trips for the entire next month
   - Include both departures (from Nkawkaw) and arrivals (to Nkawkaw)

5. **Wait for completion** - The script will show progress and a summary when done.

---

## Option 2: Use API Endpoint (Alternative)

If you can't run it locally, you can use the API endpoint (requires a secret key for security).

### Steps:

1. **Set a secret key in Vercel environment variables:**
   - Go to your Vercel project settings
   - Add environment variable: `SEED_SECRET_KEY` with a secure random string

2. **Call the API endpoint:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/seed/run \
     -H "Content-Type: application/json" \
     -H "x-seed-key: YOUR_SECRET_KEY" \
     -d '{"secret_key": "YOUR_SECRET_KEY"}'
   ```

   Or use a tool like Postman or your browser's console:
   ```javascript
   fetch('https://your-app.vercel.app/api/seed/run', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-seed-key': 'YOUR_SECRET_KEY'
     },
     body: JSON.stringify({ secret_key: 'YOUR_SECRET_KEY' })
   })
   .then(res => res.json())
   .then(data => console.log(data));
   ```

---

## What Gets Created?

- **3 Sample Drivers** (driver1, driver2, driver3)
- **5 Sample Vehicles** (various types: VIP, bus, minibus, taxi)
- **14 Routes** (7 departures + 7 arrivals)
- **Hundreds of Trips** covering:
  - Remaining days of current month
  - Entire next month
  - Multiple times per day (6 AM - 7 PM)
  - Various destinations: Accra, Kumasi, Koforidua, Tema, Cape Coast, Takoradi, Sunyani

## Test Credentials

After seeding, you can login with:
- **Username:** driver1, driver2, or driver3
- **Password:** password123

---

## Notes

- The seed script only creates **future trips** (no past dates)
- It generates **3-7 departures** and **3-7 arrivals** per day
- Trips have realistic seat availability
- You can run the seed script multiple times - it uses `ON CONFLICT` to avoid duplicates
- After seeding, refresh your homepage to see the departures/arrivals board populated

