const CERTIFICATE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ENROLLMENT_TRANSITIONS = {
  pending_payment: ['enrolled', 'cancelled'],
  enrolled: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const canTransitionEnrollment = (from, to) =>
  Boolean(ENROLLMENT_TRANSITIONS[from]?.includes(to));

// A capacity of zero means the course has not declared a limit.
const hasCapacity = (course, activeCount = 0) => {
  const capacity = Math.max(Number(course?.capacity) || 0, 0);
  return capacity === 0 || Number(activeCount) < capacity;
};

const clampProgress = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(Math.max(Math.round(numeric), 0), 100);
};

// Progress only moves learners who are actually enrolled; payment state is
// handled by the payment flow, never by a progress update.
const nextEnrollmentStatus = (currentStatus, progress) => {
  if (!['enrolled', 'in_progress'].includes(currentStatus)) return currentStatus;
  const value = clampProgress(progress);
  if (value >= 100) return 'completed';
  if (value > 0) return 'in_progress';
  return 'enrolled';
};

const makeCertificateCode = (issuedAt = new Date(), random = Math.random) => {
  const year = String(issuedAt.getFullYear()).slice(-2);
  const month = String(issuedAt.getMonth() + 1).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CERTIFICATE_ALPHABET[Math.floor(random() * CERTIFICATE_ALPHABET.length)];
  }
  return `KTC-${year}${month}-${suffix}`;
};

module.exports = {
  ENROLLMENT_TRANSITIONS,
  canTransitionEnrollment,
  hasCapacity,
  clampProgress,
  nextEnrollmentStatus,
  makeCertificateCode,
};
