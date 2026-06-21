import React, { useEffect, useState } from 'react';
import { paymentService } from '../services/paymentService';
import './PaymentModal.css';

const PaymentModal = ({
  trip,
  seatsToBook,
  onClose,
  onSuccess
}) => {
  const [methods, setMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [mockMode, setMockMode] = useState(false);

  const totalAmount = (Number(trip.fare) * seatsToBook).toFixed(2);
  const isMobileMoney = ['mtn_momo', 'vodafone_cash', 'airteltigo_money'].includes(paymentMethod);

  useEffect(() => {
    paymentService.getConfig()
      .then((config) => {
        setMethods(config.methods || []);
        setMockMode(config.mock_mode);
        const paystackMethod = config.methods?.find((method) => method.id === 'paystack');
        if (paystackMethod) {
          setPaymentMethod('paystack');
        } else if (config.methods?.length) {
          setPaymentMethod(config.methods[0].id);
        }
      })
      .catch(() => {
        setError('Unable to load payment options');
      });
  }, []);

  const pollVerification = async (reference, attempts = 12) => {
    setPolling(true);
    setStatusMessage('Waiting for payment confirmation...');

    for (let i = 0; i < attempts; i += 1) {
      try {
        const result = await paymentService.verifyPayment(reference);
        onSuccess(result);
        onClose();
        return;
      } catch (verifyError) {
        if (verifyError.response?.status !== 402) {
          setError(verifyError.response?.data?.error || 'Payment verification failed');
          setPolling(false);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    setPolling(false);
    setStatusMessage('Payment is still pending. You can verify again from My Bookings.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);

    try {
      const result = await paymentService.initializePayment({
        trip_id: trip.id,
        seats_booked: seatsToBook,
        payment_method: paymentMethod,
        phone: isMobileMoney ? phone.trim() : undefined
      });

      if (result.payment.authorization_url) {
        window.location.href = result.payment.authorization_url;
        return;
      }

      if (result.payment.reference) {
        if (mockMode || isMobileMoney) {
          if (mockMode) {
            const verified = await paymentService.verifyPayment(result.payment.reference);
            onSuccess(verified);
            onClose();
            return;
          }

          setStatusMessage(result.payment.display_text || 'Approve the prompt on your phone.');
          await pollVerification(result.payment.reference);
          return;
        }
      }

      setStatusMessage(result.message);
    } catch (submitError) {
      setError(submitError.response?.data?.error || 'Failed to start payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <h2>Complete Payment</h2>
        <p className="payment-route">
          {trip.origin} → {trip.destination}
        </p>
        <p className="payment-total">
          Total: <strong>₵{totalAmount}</strong> ({seatsToBook} seat{seatsToBook > 1 ? 's' : ''})
        </p>

        {mockMode && (
          <div className="payment-note">
            Paystack is not configured. Payments run in mock mode for development.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {statusMessage && <div className="alert alert-info">{statusMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={loading || polling}
            >
              {methods.map((method) => (
                <option key={method.id} value={method.id}>{method.label}</option>
              ))}
            </select>
          </div>

          {isMobileMoney && (
            <div className="form-group">
              <label>Mobile money number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 024XXXXXXX"
                required
                disabled={loading || polling}
              />
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading || polling}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading || polling}>
              {loading ? 'Processing...' : polling ? 'Confirming...' : 'Pay Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
