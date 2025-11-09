import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🚌 Nkawkaw Transport
        </Link>
        <ul className="navbar-menu">
          {isAuthenticated ? (
            <>
              <li><Link to="/">Home</Link></li>
              {user?.role === 'passenger' && (
                <>
                  <li><Link to="/dashboard">Dashboard</Link></li>
                  <li><Link to="/trips">Find Trips</Link></li>
                  <li><Link to="/recommendations">Recommendations</Link></li>
                  <li><Link to="/bookings">My Bookings</Link></li>
                </>
              )}
              {user?.role === 'driver' && (
                <>
                  <li><Link to="/driver/dashboard">Dashboard</Link></li>
                  <li><Link to="/trips/create">Create Trip</Link></li>
                  <li><Link to="/trips/my-trips">My Trips</Link></li>
                </>
              )}
              {user?.role === 'admin' && (
                <li><Link to="/admin">Admin Dashboard</Link></li>
              )}
              <li><Link to="/profile">Profile</Link></li>
              <li><button onClick={handleLogout} className="logout-btn">Logout</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

