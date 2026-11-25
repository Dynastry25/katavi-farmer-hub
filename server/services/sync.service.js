const mongoose = require('mongoose');

const MUTATION_KINDS = ['expense', 'debt'];
const EXPENSE_CATEGORIES = ['inputs', 'labor', 'seeds', 'transport', 'equipment', 'other'];

const CLIENT_ID_RE = /^[A-Za-z0-9_-]{6,80}$/;

const normalizeClientId = (value) => String(value || '').trim();

const isValidClientId = (value) => CLIENT_ID_RE.test(normalizeClientId(value));

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const positive = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

// Offline clients may only queue writes that belong entirely to themselves.
// Values are re-validated server-side; never trust the queued payload.
const validateMutation = (kind, payload = {}) => {
  if (!MUTATION_KINDS.includes(kind)) {
    return { ok: false, error: `Aina ya mabadiliko "${kind}" haitumiki` };
  }

  if (kind === 'expense') {
    const amount = positive(payload.amount);
    if (!amount) return { ok: false, error: 'Kiasi sahihi cha gharama kinahitajika' };
    return {
      ok: true,
      value: {
        category: EXPENSE_CATEGORIES.includes(payload.category) ? payload.category : 'other',
        amount,
        description: String(payload.description || '').slice(0, 500),
        date: toDate(payload.date) || new Date(),
      },
    };
  }

  const creditor = String(payload.creditor || '').trim();
  const principal = positive(payload.principal);
  if (creditor.length < 2) return { ok: false, error: 'Jina la mdeni au mdai linahitajika' };
  if (!principal) return { ok: false, error: 'Kiasi cha deni kinahitajika' };
  return {
    ok: true,
    value: {
      creditor: creditor.slice(0, 120),
      type: payload.type === 'receivable' ? 'receivable' : 'payable',
      principal,
      dueDate: toDate(payload.dueDate),
      note: String(payload.note || '').slice(0, 500),
    },
  };
};

module.exports = {
  MUTATION_KINDS,
  normalizeClientId,
  isValidClientId,
  validateMutation,
};
