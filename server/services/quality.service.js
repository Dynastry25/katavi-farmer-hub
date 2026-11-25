const GRADES = ['A', 'B', 'C'];

const GRADE_LABELS = {
  A: 'Daraja A (bora)',
  B: 'Daraja B (wastani)',
  C: 'Daraja C (chini)',
};

// Post-harvest thresholds used across cereals and pulses; percentages are
// measured on the lot the farmer intends to sell.
const STANDARDS = {
  moisturePct: { label: 'Unyevu (%)', ideal: 13, ceiling: 16 },
  foreignMatterPct: { label: 'Vitu vigeni (%)', ideal: 2, ceiling: 5 },
  cleanlinessPct: { label: 'Usafi (%)', ideal: 95, floor: 85 },
};

const MEASURES = Object.keys(STANDARDS);

const CERTIFICATION_STATUSES = ['none', 'pending', 'verified', 'rejected', 'expired'];

const CERTIFICATION_TRANSITIONS = {
  none: ['pending'],
  pending: ['verified', 'rejected'],
  rejected: ['pending'],
  verified: ['expired'],
  expired: ['pending'],
};

const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

const normalizeMeasures = (input = {}) => {
  const measures = {};
  for (const key of MEASURES) {
    const value = Number(input[key]);
    measures[key] = Number.isFinite(value) && value >= 0 && value <= 100 ? round1(value) : null;
  }
  return measures;
};

// Score starts at 100 and loses points for each measurement past the ideal.
// Only supplied measurements are judged; at least one is required.
const assessQuality = (input = {}) => {
  const measures = normalizeMeasures(input);
  const supplied = MEASURES.filter((key) => measures[key] !== null);
  if (!supplied.length) return null;

  let score = 100;
  const issues = [];
  if (measures.moisturePct !== null && measures.moisturePct > STANDARDS.moisturePct.ideal) {
    const excess = measures.moisturePct - STANDARDS.moisturePct.ideal;
    score -= Math.min(30, excess * 4);
    issues.push(`Unyevu ni ${measures.moisturePct}% (bora ni hadi ${STANDARDS.moisturePct.ideal}%)`);
  }
  if (measures.foreignMatterPct !== null && measures.foreignMatterPct > STANDARDS.foreignMatterPct.ideal) {
    const excess = measures.foreignMatterPct - STANDARDS.foreignMatterPct.ideal;
    score -= Math.min(25, excess * 6);
    issues.push(`Vitu vigeni ni ${measures.foreignMatterPct}% (bora ni hadi ${STANDARDS.foreignMatterPct.ideal}%)`);
  }
  if (measures.cleanlinessPct !== null && measures.cleanlinessPct < STANDARDS.cleanlinessPct.ideal) {
    const gap = STANDARDS.cleanlinessPct.ideal - measures.cleanlinessPct;
    score -= Math.min(20, gap * 1.5);
    issues.push(`Usafi ni ${measures.cleanlinessPct}% (bora ni ${STANDARDS.cleanlinessPct.ideal}%+)`);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const grade = finalScore >= 85 ? 'A' : finalScore >= 70 ? 'B' : 'C';
  return { ...measures, score: finalScore, grade, issues };
};

const canTransitionCertification = (from, to) => Boolean(CERTIFICATION_TRANSITIONS[from]?.includes(to));

// The officer's on-site evidence: lot photos, lab reference, free notes and,
// when they re-measured the lot, the inspector's own assessment.
const normalizeInspection = (input = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const photos = (Array.isArray(input.photos) ? input.photos : [])
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter((url) => url.length >= 8 && url.length <= 500 && /^(https?:\/\/|\/)/i.test(url))
    .slice(0, 6);
  const labReference = String(input.labReference || '').trim().slice(0, 120);
  const notes = String(input.notes || '').trim().slice(0, 500);
  const gradeInput = String(input.grade || '').trim().toUpperCase();
  const assessment = assessQuality(input);
  const grade = GRADES.includes(gradeInput) ? gradeInput : (assessment?.grade || '');

  let sampledAt = null;
  if (input.sampledAt) {
    const parsed = new Date(input.sampledAt);
    if (!Number.isNaN(parsed.getTime())) sampledAt = parsed;
  }

  if (!photos.length && !labReference && !notes && !assessment) return null;
  return { photos, labReference, notes, grade, sampledAt, assessment };
};

// Expiry is evaluated on read so a lapsed certificate never shows as verified.
const effectiveCertificationStatus = (certification = {}, now = new Date()) => {
  const status = CERTIFICATION_STATUSES.includes(certification.status) ? certification.status : 'none';
  if (status !== 'verified' || !certification.expiresAt) return status;
  const expiresAt = new Date(certification.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return 'verified';
  return expiresAt.getTime() <= new Date(now).getTime() ? 'expired' : 'verified';
};

const isCertified = (certification, now) => effectiveCertificationStatus(certification, now) === 'verified';

module.exports = {
  GRADES,
  GRADE_LABELS,
  STANDARDS,
  CERTIFICATION_STATUSES,
  normalizeMeasures,
  assessQuality,
  normalizeInspection,
  canTransitionCertification,
  effectiveCertificationStatus,
  isCertified,
};
