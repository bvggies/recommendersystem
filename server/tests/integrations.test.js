const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generateReference,
  isPaystackConfigured,
  MOBILE_MONEY_PROVIDERS
} = require('../utils/paystack');
const { withGhanaContext } = require('../utils/googleMaps');

test('generateReference creates unique payment references', () => {
  const first = generateReference('TRP');
  const second = generateReference('TRP');
  assert.match(first, /^TRP_/);
  assert.notEqual(first, second);
});

test('mobile money providers include MTN and Vodafone', () => {
  assert.equal(MOBILE_MONEY_PROVIDERS.mtn_momo, 'mtn');
  assert.equal(MOBILE_MONEY_PROVIDERS.vodafone_cash, 'vod');
});

test('isPaystackConfigured reflects env var', () => {
  const original = process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_SECRET_KEY;
  assert.equal(isPaystackConfigured(), false);
  if (original) {
    process.env.PAYSTACK_SECRET_KEY = original;
  }
});

test('withGhanaContext appends Ghana to local place names', () => {
  assert.equal(withGhanaContext('Nkawkaw'), 'Nkawkaw, Ghana');
  assert.equal(withGhanaContext('Accra, Ghana'), 'Accra, Ghana');
});
