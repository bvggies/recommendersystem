const { Pool } = require('pg');
require('dotenv').config();

function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    url.searchParams.set('sslmode', 'verify-full');
    return url.toString();
  } catch {
    return raw;
  }
}

const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

if (process.env.NODE_ENV !== 'production') {
  pool.on('connect', () => {
    console.log('Connected to Neon PostgreSQL database');
  });
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
    process.exit(-1);
  }
});

module.exports = pool;
