# Deployment Guide - Transport Recommender System

## ✅ GitHub Repository Setup Complete!

Your code has been successfully pushed to: **https://github.com/bvggies/recommendersystem**

## Next Steps: Deploy to Vercel

### Step 1: Connect GitHub to Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository: `bvggies/recommendersystem`
4. Vercel will detect it's a React app

### Step 2: Configure Build Settings

**Root Directory:** Leave as default (root)

**Build Command:** `npm run build`

**Output Directory:** `build`

**Install Command:** `npm install`

### Step 3: Set Environment Variables

In Vercel project settings, add these environment variables:

#### For Frontend:
```
REACT_APP_API_URL=https://your-vercel-app.vercel.app/api
```

#### For Backend (if deploying separately):
```
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_strong_random_secret_key
GROQ_API_KEY=your_groq_api_key
PORT=5000
NODE_ENV=production
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Your app will be live at: `https://your-app-name.vercel.app`

## Database Setup (Neon PostgreSQL)

### Step 1: Create Neon Database

1. Go to [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string

### Step 2: Run Database Schema

1. Connect to your Neon database (using Neon console or any PostgreSQL client)
2. Run the SQL from `server/db/schema.sql`
3. This will create all necessary tables

### Step 3: Add Database URL to Vercel

Add `DATABASE_URL` to your Vercel environment variables with your Neon connection string.

## Backend Deployment Options

### Option 1: Deploy Backend to Vercel (Recommended)

Vercel supports Node.js serverless functions. The `vercel.json` file is already configured.

**Note:** You may need to adjust the server structure for serverless functions.

### Option 2: Deploy Backend Separately

You can deploy the backend to:
- **Railway** - Easy PostgreSQL + Node.js hosting
- **Render** - Free tier available
- **Heroku** - Traditional hosting
- **DigitalOcean** - VPS option

### Option 3: Use Vercel Serverless Functions

Convert your Express routes to Vercel serverless functions for better performance.

## Post-Deployment Checklist

- [ ] Database schema is created
- [ ] Environment variables are set in Vercel
- [ ] Frontend is deployed and accessible
- [ ] Backend API is deployed and accessible
- [ ] Test user registration
- [ ] Test trip creation (as driver)
- [ ] Test booking (as passenger)
- [ ] Test recommendations
- [ ] Verify API endpoints are working

## Testing Your Deployment

1. **Test Frontend:**
   - Visit your Vercel URL
   - Try registering a new user
   - Test login functionality

2. **Test Backend:**
   - Check API health: `https://your-app.vercel.app/api/health`
   - Test authentication endpoints
   - Verify database connection

3. **Test Features:**
   - Create a trip (as driver)
   - Search for trips
   - Book a trip (as passenger)
   - View recommendations

## Troubleshooting

### Issue: API calls failing
- **Solution:** Check `REACT_APP_API_URL` matches your backend URL
- Verify CORS is enabled on backend

### Issue: Database connection errors
- **Solution:** Verify `DATABASE_URL` is correct
- Check Neon database is active
- Ensure schema is created

### Issue: Build fails
- **Solution:** Check build logs in Vercel
- Verify all dependencies are in `package.json`
- Check for TypeScript/ESLint errors

### Issue: Environment variables not working
- **Solution:** Redeploy after adding environment variables
- Check variable names match exactly
- Restart Vercel deployment

## Monitoring

- **Vercel Dashboard:** Monitor deployments and logs
- **Neon Dashboard:** Monitor database usage
- **Application Logs:** Check Vercel function logs for errors

## Security Checklist

- [ ] `JWT_SECRET` is a strong random string
- [ ] Database credentials are secure
- [ ] API keys are in environment variables (not in code)
- [ ] `.env` files are in `.gitignore`
- [ ] HTTPS is enabled (automatic with Vercel)

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Neon Docs:** https://neon.tech/docs
- **Groq Docs:** https://console.groq.com/docs

---

**Your repository is ready for deployment!** 🚀

Visit: https://github.com/bvggies/recommendersystem

