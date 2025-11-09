# Troubleshooting Registration Issues

## Common Registration Errors and Solutions

### Error: "Registration failed. Please try again."

This generic error can have several causes:

#### 1. Backend Server Not Running

**Check:**
- Is the backend server running on port 5000?
- Check terminal where you ran `cd server && npm start`

**Solution:**
```bash
cd server
npm start
```

You should see: `Server is running on port 5000`

#### 2. Cannot Connect to Server

**Error Message:** "Cannot connect to server. Please make sure the backend is running."

**Check:**
- Verify `REACT_APP_API_URL` in root `.env` file
- Should be: `REACT_APP_API_URL=http://localhost:5000/api`
- Make sure backend is running

**Solution:**
1. Check backend is running: `http://localhost:5000/api/health`
2. Should return: `{"status":"OK","message":"Transport Recommender API is running"}`

#### 3. Database Connection Error

**Check:**
- Is your Neon database active?
- Is `DATABASE_URL` correct in `server/.env`?
- Does it include `?sslmode=require`?

**Solution:**
1. Check Neon dashboard
2. Verify connection string in `server/.env`
3. Test connection manually

#### 4. User Already Exists

**Error Messages:**
- "Email already exists"
- "Username already exists"
- "Phone number already exists"

**Solution:**
- Use a different email/username/phone
- Or login with existing credentials

#### 5. Invalid Data

**Check:**
- Username, email, and password are required
- Password must be at least 6 characters
- Email must be valid format
- Role must be 'passenger' or 'driver'

## Testing Steps

### Step 1: Test Backend Health

Open browser or use curl:
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{"status":"OK","message":"Transport Recommender API is running"}
```

### Step 2: Test Registration Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "passenger"
  }'
```

### Step 3: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try registering
4. Check for error messages

### Step 4: Check Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Try registering
4. Check the `/api/auth/register` request
5. Look at:
   - Request URL (should be `http://localhost:5000/api/auth/register`)
   - Status code (200 = success, 400/500 = error)
   - Response body (shows actual error message)

## Quick Fixes

### Fix 1: Restart Backend
```bash
# Stop backend (Ctrl+C)
# Then restart:
cd server
npm start
```

### Fix 2: Clear Browser Cache
- Clear browser cache and cookies
- Or use incognito/private mode

### Fix 3: Check Environment Variables

**Backend (`server/.env`):**
```env
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_key
PORT=5000
NODE_ENV=development
```

**Frontend (`.env` in root):**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Fix 4: Reinstall Dependencies
```bash
# Backend
cd server
rm -rf node_modules
npm install

# Frontend (in root)
rm -rf node_modules
npm install
```

## Getting More Detailed Errors

The updated code now shows more specific errors:

- **"Email already exists"** - Try different email
- **"Username already exists"** - Try different username
- **"Cannot connect to server"** - Backend not running
- **"Registration failed. Please check your information"** - Check all fields

## Still Having Issues?

1. Check server logs in the terminal where backend is running
2. Check browser console for JavaScript errors
3. Check Network tab for API request/response details
4. Verify database connection is working
5. Make sure all environment variables are set correctly

