// Script to create an admin user
// Run with: node db/create-admin.js

const bcrypt = require('bcryptjs');
const pool = require('./connection');
require('dotenv').config();

const createAdmin = async () => {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@nkawkaw.com';
  const password = process.argv[4] || 'admin123';
  const fullName = process.argv[5] || 'System Administrator';

  try {
    // Check if admin already exists
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists!');
      console.log('To update role to admin, run:');
      console.log(`UPDATE users SET role = 'admin' WHERE username = '${username}';`);
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, full_name`,
      [username, email, passwordHash, fullName, 'admin']
    );

    console.log('✅ Admin user created successfully!');
    console.log('Username:', result.rows[0].username);
    console.log('Email:', result.rows[0].email);
    console.log('Role:', result.rows[0].role);
    console.log('\nYou can now login with these credentials.');
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.code === '23505') {
      console.log('User already exists. Try updating the role instead.');
    }
  } finally {
    await pool.end();
  }
};

createAdmin();

