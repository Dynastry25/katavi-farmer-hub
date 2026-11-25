const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isExpired = (deadline, now = new Date()) => {
  const parsed = toDate(deadline);
  return Boolean(parsed) && parsed.getTime() < now.getTime();
};

const ageFromDateOfBirth = (dateOfBirth, now = new Date()) => {
  const born = toDate(dateOfBirth);
  if (!born) return null;
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }
  return age;
};

const buildListFilter = (query = {}) => {
  const filter = { status: 'open' };
  if (['job', 'business'].includes(query.kind)) filter.kind = query.kind;
  if (query.category) filter.category = String(query.category);
  if (query.employmentType) filter.employmentType = String(query.employmentType);
  if (query.district) filter.district = String(query.district);

  const search = String(query.q || '').trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { requirements: pattern }];
  }
  return filter;
};

// Employers move applications forward; applicants may withdraw, or signal that
// the work is done; nobody reopens a rejected or completed application.
const APPLICATION_TRANSITIONS = {
  pending: ['shortlisted', 'accepted', 'rejected', 'withdrawn'],
  shortlisted: ['accepted', 'rejected', 'withdrawn'],
  accepted: ['completion_requested', 'completed', 'withdrawn'],
  completion_requested: ['completed', 'accepted'],
  rejected: [],
  withdrawn: [],
  completed: [],
};

const APPLICANT_MOVES = ['withdrawn', 'completion_requested'];

const canTransition = (from, to) =>
  Boolean(APPLICATION_TRANSITIONS[from]?.includes(to));

const canApplicantTransition = (from, to) => (
  APPLICANT_MOVES.includes(to) && canTransition(from, to)
);

// Money closes the job: both sides may rate only after the employer has paid
// (or marked a free/volunteer posting as waived).
const isPaymentSettled = (application = {}) => (
  ['paid', 'waived'].includes(application.paymentStatus)
);

const canRateApplication = (application = {}) => (
  application.status === 'completed' && isPaymentSettled(application)
);

const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank', 'other'];

// Returns an error message, or null when the payment entry is acceptable.
const paymentError = ({ waived, amount, payAmount = 0 } = {}) => {
  const owed = Number(payAmount) || 0;
  const paid = Number(amount) || 0;
  if (waived) {
    return owed > 0 ? 'Kazi hii ina malipo; rekodi kiasi kilicholipwa' : null;
  }
  if (!(paid > 0)) return 'Kiasi kilicholipwa kinahitajika';
  return null;
};

const nextOpportunityStatus = ({ status, positions, acceptedCount }) => {
  if (status === 'closed') return 'closed';
  if (positions > 0 && acceptedCount >= positions) return 'filled';
  return status === 'filled' ? 'open' : status;
};

module.exports = {
  escapeRegex,
  isExpired,
  ageFromDateOfBirth,
  buildListFilter,
  canTransition,
  canApplicantTransition,
  isPaymentSettled,
  canRateApplication,
  paymentError,
  nextOpportunityStatus,
  APPLICATION_TRANSITIONS,
  APPLICANT_MOVES,
  PAYMENT_METHODS,
};
