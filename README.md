# Transport Recommender System - Nkawkaw New Station

A comprehensive web application for managing transport services with AI-powered recommendations using Groq.

## Features

### 🧭 User Management
- User registration and authentication
- Role-based access (Passenger, Driver, Admin)
- Profile management
- Password reset

### 🚗 Transport Service Management
- Trip creation and management
- Vehicle information
- Seat availability tracking
- Schedule management

### 🧮 AI-Powered Recommender Engine
- Preference-based recommendations
- Collaborative filtering
- Content-based filtering
- Hybrid recommendations using Groq AI

### 🔍 Search and Filtering
- Search by destination
- Filter by fare range, vehicle type, departure time
- Sort results

### ⭐ Ratings and Reviews
- Trip rating system
- Driver reviews
- Aggregate ratings

### 🧾 Booking System
- Trip booking
- Booking history
- Cancellation

### 🛠️ Admin Dashboard
- User management
- Analytics
- System logs

## Tech Stack

### Frontend
- React (Create React App)
- React Router
- Axios
- Recharts (for analytics)

### Backend
- Node.js
- Express.js
- PostgreSQL (Neon)
- JWT Authentication
- bcryptjs

### AI
- Groq SDK

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database (Neon)
- Groq API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "ai recomender system"
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
```

4. Set up environment variables:

Create `server/.env`:
```env
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

Create `.env` in root:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

5. Set up the database:
   - Create a Neon PostgreSQL database
   - Run the schema from `server/db/schema.sql`

6. Start the backend server:
```bash
cd server
npm start
```

7. Start the frontend (in a new terminal):
```bash
npm start
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Database Setup on Neon

1. Create a new project on Neon
2. Copy the connection string
3. Update `DATABASE_URL` in your environment variables

## Project Structure

```
├── server/
│   ├── db/
│   │   ├── connection.js
│   │   └── schema.sql
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── trips.js
│   │   ├── bookings.js
│   │   ├── ratings.js
│   │   ├── recommendations.js
│   │   ├── admin.js
│   │   └── ...
│   └── server.js
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── context/
│   └── ...
└── public/
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Trips
- `GET /api/trips` - Get all trips (with filters)
- `POST /api/trips` - Create trip (driver)
- `GET /api/trips/:id` - Get trip details

### Recommendations
- `GET /api/recommendations` - Get AI-powered recommendations

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - Get user bookings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
