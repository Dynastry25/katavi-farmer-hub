const { test } = require('node:test');
const assert = require('node:assert');
const {
  canTransitionApplication,
  estimatePremium,
  referralFeeFor,
  makePolicyNumber,
} = require('../services/insurance.service');

test('insurance applications follow the referral review flow', () => {
  assert.strictEqual(canTransitionApplication('submitted', 'under_review'), true);
  assert.strictEqual(canTransitionApplication('under_review', 'quoted'), true);
  assert.strictEqual(canTransitionApplication('quoted', 'active'), true);
  assert.strictEqual(canTransitionApplication('active', 'expired'), true);

  assert.strictEqual(canTransitionApplication('submitted', 'active'), false);
  assert.strictEqual(canTransitionApplication('rejected', 'active'), false);
  assert.strictEqual(canTransitionApplication('cancelled', 'submitted'), false);
  assert.strictEqual(canTransitionApplication('unknown', 'active'), false);
});

test('estimatePremium applies the partner rate inside the sum band', () => {
  const product = { premiumRate: 5, minSumInsured: 100000, maxSumInsured: 5000000 };

  assert.strictEqual(estimatePremium(product, 2000000), 100000);
  assert.strictEqual(estimatePremium(product, '333333'), 16666.65);

  assert.strictEqual(estimatePremium(product, 50000), null);
  assert.strictEqual(estimatePremium(product, 9000000), null);
  assert.strictEqual(estimatePremium(product, 0), null);
  assert.strictEqual(estimatePremium(product, 'abc'), null);
});

test('estimatePremium treats a zero maximum as no upper bound', () => {
  const product = { premiumRate: 2.5, minSumInsured: 0, maxSumInsured: 0 };
  assert.strictEqual(estimatePremium(product, 1000000), 25000);
  assert.strictEqual(estimatePremium(product, 40000000), 1000000);
});

test('referralFeeFor pays the agreed share of the quoted premium', () => {
  assert.strictEqual(referralFeeFor({ referralRate: 10 }, 100000), 10000);
  assert.strictEqual(referralFeeFor({ referralRate: 7.5 }, 83333.33), 6250);
  assert.strictEqual(referralFeeFor({ referralRate: 0 }, 100000), 0);
  assert.strictEqual(referralFeeFor(null, 100000), 0);
});

test('policy numbers carry the issue month and avoid lookalike characters', () => {
  const code = makePolicyNumber(new Date(2026, 10, 5), () => 0);
  assert.strictEqual(code, 'POL-2611-AAAAAA');

  const another = makePolicyNumber(new Date(2026, 0, 1), () => 0.999);
  assert.match(another, /^POL-2601-[A-Z2-9]{6}$/);
  assert.strictEqual(/[IO01]/.test(another.slice(9)), false);
});
