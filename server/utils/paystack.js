const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function getPublicKey() {
  return process.env.PAYSTACK_PUBLIC_KEY || '';
}

function generateReference(prefix = 'TR') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function paystackRequest(path, options = {}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Paystack is not configured');
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || 'Paystack request failed');
  }

  return data;
}

async function initializeTransaction({
  email,
  amount,
  reference,
  callbackUrl,
  channels,
  metadata
}) {
  if (!isPaystackConfigured()) {
    return {
      status: true,
      message: 'Mock transaction initialized',
      data: {
        authorization_url: `${callbackUrl}?reference=${reference}&mock=1`,
        access_code: 'mock_access_code',
        reference
      }
    };
  }

  return paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      currency: 'GHS',
      reference,
      callback_url: callbackUrl,
      channels: channels || ['card', 'mobile_money', 'bank'],
      metadata
    })
  });
}

async function chargeMobileMoney({ email, amount, reference, phone, provider, metadata }) {
  if (!isPaystackConfigured()) {
    return {
      status: true,
      message: 'Mock mobile money charge initiated',
      data: {
        reference,
        status: 'pending',
        display_text: 'Approve the mock MTN MoMo prompt on your phone.'
      }
    };
  }

  return paystackRequest('/charge', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      currency: 'GHS',
      reference,
      mobile_money: {
        phone,
        provider
      },
      metadata
    })
  });
}

async function verifyTransaction(reference) {
  if (!isPaystackConfigured()) {
    return {
      status: true,
      message: 'Mock verification successful',
      data: {
        status: 'success',
        reference,
        amount: 0,
        currency: 'GHS',
        channel: 'mock',
        paid_at: new Date().toISOString(),
        metadata: {}
      }
    };
  }

  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

const MOBILE_MONEY_PROVIDERS = {
  mtn_momo: 'mtn',
  vodafone_cash: 'vod',
  airteltigo_money: 'tgo'
};

module.exports = {
  MOBILE_MONEY_PROVIDERS,
  isPaystackConfigured,
  getPublicKey,
  generateReference,
  initializeTransaction,
  chargeMobileMoney,
  verifyTransaction
};
