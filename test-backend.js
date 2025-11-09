// Quick test script to verify backend is working
const axios = require('axios');

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function testBackend() {
  console.log('🧪 Testing Backend Connection...\n');

  // Test 1: Health Check
  try {
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('   ✅ Health check passed:', health.data);
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    console.log('   💡 Make sure backend is running on port 5000');
    return;
  }

  // Test 2: Registration
  try {
    console.log('\n2. Testing registration endpoint...');
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'test123456',
      role: 'passenger'
    };
    
    const register = await axios.post(`${API_URL}/auth/register`, testUser);
    console.log('   ✅ Registration test passed');
    console.log('   User created:', register.data.user.username);
  } catch (error) {
    console.log('   ❌ Registration test failed');
    if (error.response) {
      console.log('   Error:', error.response.data.error);
      console.log('   Status:', error.response.status);
    } else {
      console.log('   Error:', error.message);
    }
  }

  console.log('\n✨ Backend test complete!');
}

testBackend();

