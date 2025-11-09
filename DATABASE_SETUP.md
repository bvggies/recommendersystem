# Database Setup Instructions

## ✅ Your Database Connection is Configured!

Your Neon PostgreSQL database connection string has been added to `server/.env`.

## Step 1: Connect to Your Database

You can connect using:

```bash
psql "postgresql://neondb_owner:npg_mBj4hKdTL7UJ@ep-floral-bread-adfo7kp9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

Or use the Neon Console SQL Editor at: https://console.neon.tech

## Step 2: Run the Database Schema

### Option 1: Using Neon Console (Easiest)

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click on "SQL Editor"
4. Open the file `server/db/schema.sql` from your project
5. Copy all the SQL content
6. Paste it into the SQL Editor
7. Click "Run" to execute

### Option 2: Using psql Command Line

```bash
psql "postgresql://neondb_owner:npg_mBj4hKdTL7UJ@ep-floral-bread-adfo7kp9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -f server/db/schema.sql
```

### Option 3: Using Node.js Script

I can create a script to run the schema automatically. Would you like me to do that?

## Step 3: Verify Tables Were Created

After running the schema, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see these tables:
- users
- vehicles
- routes
- trips
- bookings
- ratings
- user_preferences
- saved_searches
- notifications
- system_logs

## Step 4: Test the Connection

Once the schema is set up, test your backend connection:

```bash
cd server
npm start
```

The server should start and connect to your database successfully!

## Troubleshooting

### Connection Error?
- Verify your database is active in Neon console
- Check the connection string is correct
- Make sure `sslmode=require` is included

### Schema Errors?
- Make sure you're running the complete schema
- Check for any syntax errors in the SQL
- Verify you have proper permissions

### Can't Connect?
- Check Neon dashboard to ensure database is running
- Verify your IP is allowed (Neon allows all by default)
- Check firewall settings

---

**Next Step:** Run the database schema, then start your application!

