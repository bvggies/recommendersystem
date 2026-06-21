const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return DEV_FALLBACK_SECRET;
}

function validateJwtConfig() {
  getJwtSecret();
}

module.exports = { getJwtSecret, validateJwtConfig, DEV_FALLBACK_SECRET };
