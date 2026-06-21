import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { getApiErrorMessage } from '../utils/apiError';
import './PaymentCallback.css';

const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      setStatus('error');
      setMessage('Missing payment reference.');
      return;
    }

    paymentService.verifyPayment(reference)
      .then((result) => {
        setStatus('success');
        setMessage('Payment successful! Generating your boarding ticket...');

        const bookingId = result.booking?.id;
        if (bookingId) {
          setTimeout(() => {
            navigate(`/bookings/${bookingId}/ticket`, {
              replace: true,
              state: {
                paymentSuccess: true,
                tripId: result.booking.trip_id
              }
            });
          }, 1200);
          return;
        }

        setStatus('error');
        setMessage('Payment verified but booking was not found. Check My Bookings.');
      })
      .catch((error) => {
        setStatus('error');
        if (error.response?.status === 401) {
          setMessage('Please log in again to complete your booking verification.');
          return;
        }
        setMessage(getApiErrorMessage(error, 'Payment verification failed.'));
      });
  }, [searchParams, navigate]);

  return (
    <div className="payment-callback-page">
      <div className={`payment-callback-card ${status}`}>
        <h1>
          {status === 'success'
            ? 'Payment Successful'
            : status === 'error'
            ? 'Payment Issue'
            : 'Processing Payment'}
        </h1>
        <p>{message}</p>
        {status === 'loading' && <div className="payment-spinner" />}
        {status === 'error' && (
          <div className="payment-callback-actions">
            <Link to="/login" className="btn-primary">Log In</Link>
            <Link to="/trips" className="btn-secondary">Browse Trips</Link>
            <Link to="/bookings" className="btn-secondary">My Bookings</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
