const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const MIN_AMOUNT_PESEWAS = 100;

function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function getPublicKey() {
  return process.env.PAYSTACK_PUBLIC_KEY || '';
}

function generateReference(prefix = 'TR') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePaystackEmail(email, userId, username) {
  const trimmed = String(email || '').trim();
  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed;
  }

  const safeName = String(username || 'passenger')
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 32) || 'passenger';

  return `${safeName}.${userId}@passengers.nkawkawtransport.com`;
}

function normalizeMetadata(metadata = {}) {
  const normalized = {};

  Object.entries(metadata).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    normalized[key] = typeof value === 'string' ? value : JSON.stringify(value);
  });

  return normalized;
}

function toPesewas(amount) {
  const pesewas = Math.round(Number(amount) * 100);
  if (!Number.isFinite(pesewas) || pesewas < MIN_AMOUNT_PESEWAS) {
    throw new Error(`Minimum payment amount is ₵${(MIN_AMOUNT_PESEWAS / 100).toFixed(2)}`);
  }
  return pesewas;
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

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Invalid response from Paystack');
  }

  if (!response.ok || !data.status) {
    const detail = data?.data?.message || data?.message || 'Paystack request failed';
    const error = new Error(detail);
    error.paystack = data;
    error.statusCode = response.status;
    throw error;
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
      amount: toPesewas(amount),
      currency: 'GHS',
      reference,
      callback_url: callbackUrl,
      channels: channels || ['card', 'mobile_money', 'bank'],
      metadata: normalizeMetadata(metadata)
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

  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  if (normalizedPhone.length < 10) {
    throw new Error('Enter a valid Ghana mobile money number');
  }

  return paystackRequest('/charge', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: toPesewas(amount),
      currency: 'GHS',
      reference,
      mobile_money: {
        phone: normalizedPhone,
        provider
      },
      metadata: normalizeMetadata(metadata)
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
  MIN_AMOUNT_PESEWAS,
  isPaystackConfigured,
  getPublicKey,
  generateReference,
  normalizePaystackEmail,
  normalizeMetadata,
  toPesewas,
  initializeTransaction,
  chargeMobileMoney,
  verifyTransaction
};
