import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Trips from './pages/Trips';
import Profile from './pages/Profile';
import Recommendations from './pages/Recommendations';
import Bookings from './pages/Bookings';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import CreateTrip from './pages/CreateTrip';
import MyTrips from './pages/MyTrips';
import AdminDashboard from './pages/AdminDashboard';
import AdminVehicles from './pages/AdminVehicles';
import AdminDrivers from './pages/AdminDrivers';
import AdminPassengers from './pages/AdminPassengers';
import AdminTrips from './pages/AdminTrips';
import AdminDepartures from './pages/AdminDepartures';
import TripDetail from './pages/TripDetail';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/trips/:id" element={<TripDetail />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <PassengerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/driver/dashboard" 
                element={
                  <ProtectedRoute requiredRole="driver">
                    <DriverDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/trips/create" 
                element={
                  <ProtectedRoute requiredRole="driver">
                    <CreateTrip />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/trips/my-trips" 
                element={
                  <ProtectedRoute requiredRole="driver">
                    <MyTrips />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/recommendations" 
                element={
                  <ProtectedRoute>
                    <Recommendations />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bookings" 
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/vehicles" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminVehicles />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/drivers" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDrivers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/passengers" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPassengers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/trips" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminTrips />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/departures" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDepartures />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
