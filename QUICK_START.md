# 🚀 Quick Start Guide

## ✅ Groq API Key Configured!

Your Groq API key has been provided. Now you need to:

### Step 1: Create Environment Files

#### Create `server/.env` file:

```env
DATABASE_URL=your_neon_postgresql_connection_string_here
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
NODE_ENV=development
```

#### Create `.env` in root directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 2: Set Up Neon Database

1. Go to [Neon](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string (looks like: `postgresql://user:pass@host/db?sslmode=require`)
4. Replace `your_neon_postgresql_connection_string_here` in `server/.env`

### Step 3: Generate JWT Secret

Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online generator. Replace `your_super_secret_jwt_key_change_this_in_production` in `server/.env`

### Step 4: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Step 5: Set Up Database Schema

1. Connect to your Neon database (use Neon console SQL editor)
2. Copy the contents of `server/db/schema.sql`
3. Run it in the SQL editor to create all tables

### Step 6: Start the Application

#### Option 1: Run Both Together
```bash
npm run dev
```

#### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
npm start
```

### Step 7: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/api/health

## 🎯 What's Already Done

✅ Groq API key: Configure in `server/.env` file
✅ All code is written and ready
✅ Database schema is prepared
✅ GitHub repository is set up

## 📝 What You Need to Do

1. ✅ Create `server/.env` with your Groq API key (already provided above)
2. ⏳ Create Neon PostgreSQL database
3. ⏳ Add database URL to `server/.env`
4. ⏳ Generate and add JWT secret to `server/.env`
5. ⏳ Run database schema
6. ⏳ Install dependencies
7. ⏳ Start the application

## 🔒 Security Reminder

- **Never commit `.env` files to GitHub** (already in `.gitignore`)
- Keep your API keys secret
- Use different keys for production

## 🆘 Troubleshooting

### Can't connect to database?
- Check your `DATABASE_URL` is correct
- Make sure it includes `?sslmode=require` at the end
- Verify Neon database is active

### API not working?
- Check backend is running on port 5000
- Verify `REACT_APP_API_URL` in root `.env` matches backend URL
- Check CORS is enabled (already configured)

### Groq API errors?
- Verify API key is correct in `server/.env`
- Check your Groq account has credits/quota
- Review Groq console for usage limits

---

**You're almost ready!** Just set up the database and you're good to go! 🎉

