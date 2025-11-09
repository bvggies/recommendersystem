const express = require('express');
const Groq = require('groq-sdk');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

// Get recommendations for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { origin, destination, limit = 10 } = req.query;

    // Get user preferences
    const userResult = await pool.query(
      'SELECT fare_range_min, fare_range_max, preferred_routes FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0] || {};
    const fareMin = user.fare_range_min || 0;
    const fareMax = user.fare_range_max || 1000;

    // Get user's booking history for collaborative filtering
    const bookingHistory = await pool.query(
      `SELECT t.route_id, t.fare, v.vehicle_type, v.comfort_level, r.rating
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN ratings r ON r.trip_id = t.id AND r.passenger_id = b.passenger_id
       WHERE b.passenger_id = $1 AND b.booking_status = 'completed'
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    // Get available trips
    let query = `
      SELECT t.*, u.full_name as driver_name,
             v.vehicle_type, v.registration_number, v.comfort_level,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(DISTINCT b.id) as booking_count
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN ratings r ON r.driver_id = t.driver_id
      LEFT JOIN bookings b ON b.trip_id = t.id
      WHERE t.status = 'scheduled' AND t.departure_time > NOW() AND t.available_seats > 0
    `;
    const params = [];
    let paramCount = 1;

    if (origin) {
      query += ` AND t.origin ILIKE $${paramCount}`;
      params.push(`%${origin}%`);
      paramCount++;
    }

    if (destination) {
      query += ` AND t.destination ILIKE $${paramCount}`;
      params.push(`%${destination}%`);
      paramCount++;
    }

    query += ` AND t.fare >= $${paramCount} AND t.fare <= $${paramCount + 1}`;
    params.push(fareMin, fareMax);
    paramCount += 2;

    query += ` GROUP BY t.id, u.full_name, v.vehicle_type, v.registration_number, v.comfort_level
               ORDER BY avg_rating DESC, booking_count DESC, t.departure_time ASC
               LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const tripsResult = await pool.query(query, params);
    let trips = tripsResult.rows;

    // Use Groq AI for intelligent recommendations
    if (trips.length > 0 && process.env.GROQ_API_KEY) {
      try {
        const userPreferences = {
          fare_range: { min: fareMin, max: fareMax },
          booking_history: bookingHistory.rows,
          preferred_routes: user.preferred_routes || []
        };

        const prompt = `You are a travel recommendation system. Based on the following user preferences and available trips, rank and recommend the best trips.

User Preferences:
- Fare Range: ${fareMin} - ${fareMax}
- Previous Bookings: ${JSON.stringify(bookingHistory.rows.slice(0, 5))}
- Preferred Routes: ${user.preferred_routes || 'None'}

Available Trips:
${trips.slice(0, 20).map((t, i) => `${i + 1}. ${t.origin} to ${t.destination}, Fare: ${t.fare}, Rating: ${t.avg_rating}, Vehicle: ${t.vehicle_type}, Departure: ${t.departure_time}`).join('\n')}

Return a JSON array of trip IDs in order of recommendation priority (best first). Consider: price, rating, vehicle comfort, departure time, and user preferences.`;

        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_tokens: 500
        });

        const response = completion.choices[0]?.message?.content || '';
        const recommendedIds = JSON.parse(response.match(/\[[\d,\s]+\]/)?.[0] || '[]');

        if (recommendedIds.length > 0) {
          // Reorder trips based on AI recommendations
          const tripMap = new Map(trips.map(t => [t.id, t]));
          const recommended = recommendedIds
            .map(id => tripMap.get(id))
            .filter(Boolean);
          const remaining = trips.filter(t => !recommendedIds.includes(t.id));
          trips = [...recommended, ...remaining];
        }
      } catch (aiError) {
        console.error('AI recommendation error:', aiError);
        // Continue with default ranking if AI fails
      }
    }

    res.json({
      recommendations: trips,
      user_preferences: {
        fare_range: { min: fareMin, max: fareMax },
        preferred_routes: user.preferred_routes || []
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

module.exports = router;

