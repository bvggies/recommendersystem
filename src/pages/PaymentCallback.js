import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import './PaymentCallback.css';

const PaymentCallback = () => {
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
      .then(() => {
        setStatus('success');
        setMessage('Payment successful. Your booking is confirmed.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Payment verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="payment-callback-page">
      <div className={`payment-callback-card ${status}`}>
        <h1>{status === 'success' ? 'Payment Successful' : status === 'error' ? 'Payment Issue' : 'Processing Payment'}</h1>
        <p>{message}</p>
        <div className="payment-callback-actions">
          <Link to="/bookings" className="btn-primary">View My Bookings</Link>
          <Link to="/trips" className="btn-secondary">Browse Trips</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;
