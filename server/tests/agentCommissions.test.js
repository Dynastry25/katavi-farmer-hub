const { test } = require('node:test');
const assert = require('node:assert');
const {
  COMMISSION_RATES,
  canTransitionCommission,
  commissionAmount,
  makeAgentCode,
  buildReference,
  commissionSummary,
} = require('../services/agent.service');

test('commission rates cover every supported activity', () => {
  assert.strictEqual(COMMISSION_RATES.farmer_registration, 1000);
  assert.strictEqual(COMMISSION_RATES.crop_listing, 500);
  assert.strictEqual(commissionAmount('completed_order'), 3000);
  assert.strictEqual(commissionAmount('unknown_event'), 0);
});

test('commission transitions only move forward through review', () => {
  assert.strictEqual(canTransitionCommission('pending', 'approved'), true);
  assert.strictEqual(canTransitionCommission('pending', 'rejected'), true);
  assert.strictEqual(canTransitionCommission('approved', 'paid'), true);
  assert.strictEqual(canTransitionCommission('approved', 'rejected'), true);

  assert.strictEqual(canTransitionCommission('pending', 'paid'), false);
  assert.strictEqual(canTransitionCommission('paid', 'rejected'), false);
  assert.strictEqual(canTransitionCommission('rejected', 'approved'), false);
});

test('agent codes use the unambiguous alphabet and a fixed prefix', () => {
  const code = makeAgentCode(() => 0);
  assert.strictEqual(code, 'AGT-AAAAAA');

  const another = makeAgentCode(() => 0.999);
  assert.match(another, /^AGT-[A-Z2-9]{6}$/);
  assert.strictEqual(/[IO01]/.test(another.slice(4)), false);
});

test('buildReference ties one commission to one real activity', () => {
  assert.strictEqual(
    buildReference('farmer_registration', { farmerId: 'abc' }),
    'commission:farmer_registration:abc'
  );
  assert.strictEqual(
    buildReference('completed_order', { orderId: 'ord1' }),
    'commission:completed_order:ord1'
  );
  assert.strictEqual(buildReference('group_training', {}), 'commission:group_training:manual');
});

test('commissionSummary totals counts and amounts by status', () => {
  const summary = commissionSummary([
    { status: 'pending', amount: 1000 },
    { status: 'pending', amount: 500 },
    { status: 'approved', amount: 3000 },
    { status: 'paid', amount: 2000 },
    { status: 'rejected', amount: 1000 },
  ]);

  assert.deepStrictEqual(summary.pending, { count: 2, amount: 1500 });
  assert.deepStrictEqual(summary.approved, { count: 1, amount: 3000 });
  assert.deepStrictEqual(summary.rejected, { count: 1, amount: 1000 });
  assert.strictEqual(summary.totalEarned, 2000);
});

test('commissionSummary ignores unknown statuses and handles empty input', () => {
  const empty = commissionSummary();
  assert.strictEqual(empty.pending.count, 0);
  assert.strictEqual(empty.totalEarned, 0);

  const odd = commissionSummary([{ status: 'weird', amount: 999 }]);
  assert.strictEqual(odd.totalEarned, 0);
});
