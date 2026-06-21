const test = require('node:test');
const assert = require('node:assert/strict');

test('scheduled status filter should require future departure (query contract)', () => {
  const status = 'scheduled';
  const conditions = [];

  if (status && status !== 'all') {
    conditions.push(`status = '${status}'`);
    if (status === 'scheduled') {
      conditions.push('departure_time > NOW()');
    }
  }

  assert.ok(conditions.includes("status = 'scheduled'"));
  assert.ok(conditions.includes('departure_time > NOW()'));
});
