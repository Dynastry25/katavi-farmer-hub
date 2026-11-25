const AGENT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Example figures from the blueprint, not approved rates; ops can change them
// in one place and both commissions and the public rate card follow.
const COMMISSION_RATES = {
  farmer_registration: 1000,
  crop_listing: 500,
  completed_order: 3000,
  group_training: 2000,
};

const COMMISSION_TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: [],
};

const canTransitionCommission = (from, to) =>
  Boolean(COMMISSION_TRANSITIONS[from]?.includes(to));

const commissionAmount = (eventType) => Number(COMMISSION_RATES[eventType]) || 0;

const makeAgentCode = (random = Math.random) => {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += AGENT_CODE_ALPHABET[Math.floor(random() * AGENT_CODE_ALPHABET.length)];
  }
  return `AGT-${suffix}`;
};

// One reference per real activity, so duplicate submissions and retries cannot
// produce a second payout for the same farmer, listing, order or training.
const buildReference = (eventType, metadata = {}) => {
  const target = metadata.farmerId || metadata.cropId || metadata.orderId
    || metadata.groupId || metadata.key;
  return `commission:${eventType}:${target || 'manual'}`;
};

const commissionSummary = (rows = []) => {
  const summary = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    totalEarned: 0,
  };
  for (const row of rows) {
    if (!summary[row.status]) continue;
    summary[row.status].count += 1;
    summary[row.status].amount += Number(row.amount) || 0;
    if (row.status === 'paid') summary.totalEarned += Number(row.amount) || 0;
  }
  return summary;
};

module.exports = {
  COMMISSION_RATES,
  COMMISSION_TRANSITIONS,
  canTransitionCommission,
  commissionAmount,
  makeAgentCode,
  buildReference,
  commissionSummary,
};
