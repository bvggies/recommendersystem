const test = require('node:test');
const assert = require('node:assert/strict');

const { getJwtSecret, DEV_FALLBACK_SECRET } = require('../utils/jwtSecret');

test('getJwtSecret returns configured secret', () => {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret-value';

  try {
    assert.equal(getJwtSecret(), 'test-secret-value');
  } finally {
    if (original === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = original;
    }
  }
});

test('getJwtSecret uses dev fallback outside production', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalEnv = process.env.NODE_ENV;
  const originalVercel = process.env.VERCEL;

  delete process.env.JWT_SECRET;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL;

  try {
    assert.equal(getJwtSecret(), DEV_FALLBACK_SECRET);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }

    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }

    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  }
});

test('getJwtSecret throws in production when unset', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalEnv = process.env.NODE_ENV;

  delete process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production';

  try {
    assert.throws(() => getJwtSecret(), /JWT_SECRET environment variable is required/);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }

    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
  }
});
