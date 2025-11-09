# Vercel Deployment Guide - Fixed

## ✅ Issue Fixed: API Connection

The frontend was trying to connect to `localhost:5000` in production. This has been fixed!

## Changes Made

1. **API URL Configuration** - Now automatically detects environment:
   - **Production (Vercel)**: Uses relative path `/api` (same domain)
   - **Development**: Uses `http://localhost:5000/api`

2. **Vercel Configuration** - Updated `vercel.json` for proper routing

## Deploy to Vercel

### Step 1: Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

#### Required Variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_mBj4hKdTL7UJ@ep-floral-bread-adfo7kp9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

```
JWT_SECRET=05498052960582838371 05498052960582838371
```

```
GROQ_API_KEY=your_groq_api_key_here
```

```
NODE_ENV=production
```

#### Optional (for custom API URL):

```
REACT_APP_API_URL=/api
```

**Note:** If you don't set `REACT_APP_API_URL`, it will automatically use `/api` in production.

### Step 2: Configure Build Settings

In Vercel project settings:

- **Framework Preset:** Create React App
- **Root Directory:** `./` (root)
- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Install Command:** `npm install`

### Step 3: Deploy

1. Push your latest changes to GitHub
2. Vercel will automatically deploy
3. Or manually trigger deployment in Vercel dashboard

### Step 4: Verify Deployment

After deployment:

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try registering a user
3. Check browser console for any errors
4. Test API: `https://your-app.vercel.app/api/health`

## How It Works Now

### Development (Local)
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- API calls go to: `http://localhost:5000/api`

### Production (Vercel)
- Frontend: `https://your-app.vercel.app`
- Backend: Same domain (serverless functions)
- API calls go to: `https://your-app.vercel.app/api` (relative path)

## Troubleshooting

### Still Getting "Cannot connect to server"?

1. **Check Environment Variables:**
   - Go to Vercel → Project → Settings → Environment Variables
   - Make sure all variables are set
   - Redeploy after adding variables

2. **Check Build Logs:**
   - Go to Vercel → Project → Deployments
   - Click on latest deployment
   - Check build logs for errors

3. **Check Function Logs:**
   - Go to Vercel → Project → Functions
   - Check for any runtime errors

4. **Test API Directly:**
   - Visit: `https://your-app.vercel.app/api/health`
   - Should return: `{"status":"OK","message":"Transport Recommender API is running"}`

5. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Check Console for errors
   - Check Network tab for failed requests

### Common Issues

**Issue:** API returns 404
- **Solution:** Make sure `vercel.json` is correct and routes are properly configured

**Issue:** Database connection error
- **Solution:** Verify `DATABASE_URL` is set correctly in Vercel environment variables

**Issue:** CORS errors
- **Solution:** CORS is already configured in `server.js` to allow all origins

**Issue:** Environment variables not working
- **Solution:** Redeploy after adding environment variables (they're only available at build/runtime)

## Next Steps

1. ✅ Push latest changes to GitHub
2. ✅ Set environment variables in Vercel
3. ✅ Deploy (automatic or manual)
4. ✅ Test the application
5. ✅ Verify API is working

---

**Your app should now work on Vercel!** 🚀

The API will automatically use the correct URL based on the environment.

