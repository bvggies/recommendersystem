import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    role: 'passenger'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Remove confirmPassword but keep password
      const { confirmPassword, ...userData } = formData;
      console.log('Sending registration data:', { ...userData, password: '***' }); // Debug log
      await register(userData);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      
      // Check if it's a network error
      if (!err.response) {
        setError('Cannot connect to server. Please make sure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="header-icon">🚌</div>
          <h2>Create Your Account</h2>
          <p>Join Nkawkaw Transport System</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-grid">
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="full_name">
                <span className="label-icon">👤</span>
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>

            {/* Username */}
            <div className="form-group">
              <label htmlFor="username">
                <span className="label-icon">🔐</span>
                Username *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a username"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">
                <span className="label-icon">📧</span>
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">
                <span className="label-icon">📱</span>
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+233 XX XXX XXXX"
              />
            </div>

            {/* Role */}
            <div className="form-group">
              <label htmlFor="role">
                <span className="label-icon">🎭</span>
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="passenger">👤 Passenger</option>
                <option value="driver">🚗 Driver</option>
              </select>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">
                <span className="label-icon">🔒</span>
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword">
                <span className="label-icon">✅</span>
                Confirm Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter your password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <>
                <span className="btn-icon">⏳</span>
                Registering...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Create Account
              </>
            )}
          </button>
        </form>
        
        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
