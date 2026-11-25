const POLICY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const APPLICATION_TRANSITIONS = {
  submitted: ['under_review', 'rejected', 'cancelled'],
  under_review: ['quoted', 'rejected', 'cancelled'],
  quoted: ['active', 'rejected', 'cancelled'],
  active: ['expired', 'cancelled'],
  rejected: [],
  expired: [],
  cancelled: [],
};

const ACTIVE_STATUSES = ['submitted', 'under_review', 'quoted', 'active'];

const canTransitionApplication = (from, to) =>
  Boolean(APPLICATION_TRANSITIONS[from]?.includes(to));

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Returns null when the sum insured falls outside the partner's accepted band;
// the caller turns that into a validation message instead of guessing.
const estimatePremium = (product, sumInsured) => {
  const sum = Number(sumInsured);
  if (!Number.isFinite(sum) || sum <= 0) return null;

  const min = Number(product?.minSumInsured) || 0;
  const max = Number(product?.maxSumInsured) || 0;
  if (min > 0 && sum < min) return null;
  if (max > 0 && sum > max) return null;

  return round2(sum * (Number(product?.premiumRate) || 0) / 100);
};

// Agreed partner share of the premium; recorded, not collected by the platform.
const referralFeeFor = (product, premium) =>
  round2((Number(premium) || 0) * (Number(product?.referralRate) || 0) / 100);

const makePolicyNumber = (issuedAt = new Date(), random = Math.random) => {
  const year = String(issuedAt.getFullYear()).slice(-2);
  const month = String(issuedAt.getMonth() + 1).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += POLICY_ALPHABET[Math.floor(random() * POLICY_ALPHABET.length)];
  }
  return `POL-${year}${month}-${suffix}`;
};

module.exports = {
  APPLICATION_TRANSITIONS,
  ACTIVE_STATUSES,
  canTransitionApplication,
  estimatePremium,
  referralFeeFor,
  makePolicyNumber,
};
