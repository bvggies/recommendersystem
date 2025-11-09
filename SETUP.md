# Setup Guide - Transport Recommender System

## Step-by-Step Setup Instructions

### 1. Database Setup (Neon PostgreSQL)

1. Go to [Neon](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string (it will look like: `postgresql://user:password@host/database?sslmode=require`)
4. Save this for later use in environment variables

### 2. Groq API Setup

1. Go to [Groq](https://console.groq.com) and create an account
2. Create an API key
3. Save this for environment variables

### 3. Install Dependencies

#### Frontend
```bash
npm install
```

#### Backend
```bash
cd server
npm install
cd ..
```

### 4. Environment Variables

#### Backend (`server/.env`)
Create `server/.env` file:
```env
DATABASE_URL=your_neon_postgresql_connection_string_here
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
NODE_ENV=development
```

#### Frontend (`.env`)
Create `.env` in root directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Database Schema

1. Connect to your Neon database using any PostgreSQL client or the Neon console
2. Run the SQL script from `server/db/schema.sql` to create all tables

### 6. Run the Application

#### Terminal 1 - Backend Server
```bash
cd server
npm start
```
The server will run on `http://localhost:5000`

#### Terminal 2 - Frontend
```bash
npm start
```
The frontend will run on `http://localhost:3000`

### 7. Test the Application

1. Open `http://localhost:3000` in your browser
2. Register a new account (try both passenger and driver roles)
3. Login with your credentials
4. Explore the features:
   - Search for trips
   - Create trips (as driver)
   - View recommendations
   - Update profile

## Common Issues and Solutions

### Issue: Database Connection Error
- **Solution**: Check your `DATABASE_URL` in `server/.env`. Make sure it includes `?sslmode=require` at the end.

### Issue: CORS Error
- **Solution**: The backend already has CORS enabled. Make sure the frontend `.env` has the correct `REACT_APP_API_URL`.

### Issue: JWT Token Error
- **Solution**: Make sure `JWT_SECRET` is set in `server/.env` and is a strong random string.

### Issue: Groq API Error
- **Solution**: Verify your `GROQ_API_KEY` is correct. The recommendations will still work without it, but won't use AI.

## Deployment to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo-url
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `REACT_APP_API_URL` (set to your Vercel API URL)
4. Deploy

### 3. Update Frontend Environment Variable

After deployment, update `REACT_APP_API_URL` in Vercel to point to your deployed API URL.

## Next Steps

- Add more features from the requirements
- Customize the UI
- Add Google Maps integration
- Implement payment gateway
- Add SMS/Email notifications

