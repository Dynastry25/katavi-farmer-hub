const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canTransition,
  canApplicantTransition,
  isPaymentSettled,
  canRateApplication,
  paymentError,
} = require('../services/opportunity.service');

test('worker may submit completion, employer confirms it', () => {
  assert.equal(canApplicantTransition('accepted', 'completion_requested'), true);
  assert.equal(canTransition('completion_requested', 'completed'), true);
  assert.equal(canApplicantTransition('pending', 'completed'), false);
  assert.equal(canTransition('completed', 'accepted'), false);
});

test('applicants may only withdraw or submit completion', () => {
  assert.equal(canApplicantTransition('accepted', 'withdrawn'), true);
  assert.equal(canApplicantTransition('pending', 'accepted'), false);
});

test('payment settles the job and unlocks rating', () => {
  const completed = { status: 'completed', paymentStatus: 'unpaid' };
  assert.equal(isPaymentSettled(completed), false);
  assert.equal(canRateApplication(completed), false);

  assert.equal(canRateApplication({ ...completed, paymentStatus: 'paid' }), true);
  assert.equal(canRateApplication({ status: 'accepted', paymentStatus: 'paid' }), false);
});

test('payment entry requires an amount unless the posting is free', () => {
  assert.equal(paymentError({ amount: 0 }), 'Kiasi kilicholipwa kinahitajika');
  assert.equal(paymentError({ amount: 15000 }), null);
  assert.equal(paymentError({ waived: true, payAmount: 0 }), null);
  assert.ok(paymentError({ waived: true, payAmount: 5000 }));
  assert.equal(paymentError({ amount: 12000, payAmount: 5000 }), null);
});
