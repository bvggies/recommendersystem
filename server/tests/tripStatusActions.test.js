const test = require('node:test');
const assert = require('node:assert/strict');

const { formatStatusReason, VALID_REASONS } = require('../utils/tripStatusActions');

test('formatStatusReason returns human-readable labels', () => {
  assert.equal(formatStatusReason('vehicle_breakdown'), 'Vehicle breakdown');
  assert.equal(formatStatusReason('unknown'), 'unknown');
});

test('VALID_REASONS includes operational disruption categories', () => {
  assert.ok(VALID_REASONS.includes('vehicle_breakdown'));
  assert.ok(VALID_REASONS.includes('weather'));
  assert.ok(VALID_REASONS.includes('other'));
});
