const { test } = require('node:test');
const assert = require('node:assert');
const {
  normalizeMeasures,
  assessQuality,
  canTransitionCertification,
  effectiveCertificationStatus,
  isCertified,
} = require('../services/quality.service');

test('assessQuality grades clean lots as A and lists the measurements', () => {
  const result = assessQuality({ moisturePct: 12, foreignMatterPct: 1, cleanlinessPct: 98 });
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.grade, 'A');
  assert.deepStrictEqual(result.issues, []);
  assert.strictEqual(result.moisturePct, 12);
});

test('assessQuality drops the grade for wet and dirty lots', () => {
  const result = assessQuality({ moisturePct: 18, foreignMatterPct: 6, cleanlinessPct: 80 });
  assert.strictEqual(result.grade, 'C');
  assert.ok(result.score <= 45);
  assert.strictEqual(result.issues.length, 3);

  const borderline = assessQuality({ moisturePct: 17 });
  assert.strictEqual(borderline.grade, 'B');
  assert.strictEqual(borderline.score, 84);
  assert.ok(borderline.issues[0].includes('Unyevu'));
});

test('assessQuality needs at least one valid measurement', () => {
  assert.strictEqual(assessQuality({}), null);
  assert.strictEqual(assessQuality({ moisturePct: 'abc' }), null);
  assert.strictEqual(assessQuality({ moisturePct: -1, foreignMatterPct: 200 }), null);
  assert.deepStrictEqual(normalizeMeasures({ moisturePct: '12.345', cleanlinessPct: 150 }), {
    moisturePct: 12.3,
    foreignMatterPct: null,
    cleanlinessPct: null,
  });
});

test('certification transitions follow the review flow', () => {
  assert.strictEqual(canTransitionCertification('none', 'pending'), true);
  assert.strictEqual(canTransitionCertification('pending', 'verified'), true);
  assert.strictEqual(canTransitionCertification('pending', 'rejected'), true);
  assert.strictEqual(canTransitionCertification('rejected', 'pending'), true);
  assert.strictEqual(canTransitionCertification('verified', 'expired'), true);
  assert.strictEqual(canTransitionCertification('none', 'verified'), false);
  assert.strictEqual(canTransitionCertification('rejected', 'verified'), false);
});

test('expired certificates are reported as expired, not verified', () => {
  const now = new Date('2026-11-25T00:00:00Z');
  const valid = { status: 'verified', expiresAt: '2027-01-01T00:00:00Z' };
  const lapsed = { status: 'verified', expiresAt: '2026-10-01T00:00:00Z' };

  assert.strictEqual(effectiveCertificationStatus(valid, now), 'verified');
  assert.strictEqual(effectiveCertificationStatus(lapsed, now), 'expired');
  assert.strictEqual(effectiveCertificationStatus({ status: 'verified' }, now), 'verified');
  assert.strictEqual(effectiveCertificationStatus({}, now), 'none');
  assert.strictEqual(isCertified(valid, now), true);
  assert.strictEqual(isCertified(lapsed, now), false);
});
