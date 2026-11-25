const { test } = require('node:test');
const assert = require('node:assert');
const {
  canTransitionEnrollment,
  hasCapacity,
  clampProgress,
  nextEnrollmentStatus,
  makeCertificateCode,
} = require('../services/training.service');

test('enrollment transitions follow payment and completion flow', () => {
  assert.strictEqual(canTransitionEnrollment('pending_payment', 'enrolled'), true);
  assert.strictEqual(canTransitionEnrollment('enrolled', 'in_progress'), true);
  assert.strictEqual(canTransitionEnrollment('in_progress', 'completed'), true);

  assert.strictEqual(canTransitionEnrollment('pending_payment', 'completed'), false);
  assert.strictEqual(canTransitionEnrollment('completed', 'cancelled'), false);
  assert.strictEqual(canTransitionEnrollment('cancelled', 'enrolled'), false);
});

test('hasCapacity treats zero capacity as unlimited', () => {
  assert.strictEqual(hasCapacity({ capacity: 0 }, 500), true);
  assert.strictEqual(hasCapacity({ capacity: 10 }, 9), true);
  assert.strictEqual(hasCapacity({ capacity: 10 }, 10), false);
});

test('clampProgress keeps progress inside 0..100 and rounds', () => {
  assert.strictEqual(clampProgress('42.6'), 43);
  assert.strictEqual(clampProgress(-5), 0);
  assert.strictEqual(clampProgress(180), 100);
  assert.strictEqual(clampProgress('abc'), 0);
});

test('nextEnrollmentStatus derives status only for active learners', () => {
  assert.strictEqual(nextEnrollmentStatus('enrolled', 0), 'enrolled');
  assert.strictEqual(nextEnrollmentStatus('enrolled', 15), 'in_progress');
  assert.strictEqual(nextEnrollmentStatus('in_progress', 100), 'completed');
  assert.strictEqual(nextEnrollmentStatus('pending_payment', 100), 'pending_payment');
  assert.strictEqual(nextEnrollmentStatus('completed', 40), 'completed');
  assert.strictEqual(nextEnrollmentStatus('cancelled', 100), 'cancelled');
});

test('certificate codes carry issue month and a random suffix', () => {
  const code = makeCertificateCode(new Date(2026, 10, 5), () => 0);
  assert.strictEqual(code, 'KTC-2611-AAAAAA');

  const another = makeCertificateCode(new Date(2026, 0, 1), () => 0.999);
  assert.match(another, /^KTC-2601-[A-Z2-9]{6}$/);
  assert.strictEqual(/[IO01]/.test(another.slice(9)), false);
});
