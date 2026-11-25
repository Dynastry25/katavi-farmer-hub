const { monthKey } = require('./financePlan.service');

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const INVOICE_TRANSITIONS = {
  draft: ['issued', 'void'],
  issued: ['paid', 'void'],
  paid: [],
  void: [],
};

const canInvoiceTransition = (from, to) =>
  Boolean(INVOICE_TRANSITIONS[from]?.includes(to));

// Invoice lines carry their own amount so the stored total never depends on
// re-reading quantity/price later.
const invoiceTotals = ({ lineItems = [], taxRate = 0 } = {}) => {
  const items = lineItems.map((item) => ({
    description: String(item.description || '').trim().slice(0, 200),
    quantity: Math.max(Number(item.quantity) || 0, 0),
    unitPrice: Math.max(Number(item.unitPrice) || 0, 0),
    amount: round2(Math.max(Number(item.quantity) || 0, 0) * Math.max(Number(item.unitPrice) || 0, 0)),
  }));
  const subtotal = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const rate = Math.min(Math.max(Number(taxRate) || 0, 0), 100);
  const taxAmount = round2((subtotal * rate) / 100);
  return { items, subtotal, taxRate: rate, taxAmount, totalAmount: round2(subtotal + taxAmount) };
};

// Stored statuses stay draft/issued/paid/void; "overdue" is derived at read time.
const effectiveStatus = (invoice = {}, now = new Date()) => {
  if (['paid', 'void', 'draft'].includes(invoice.status)) return invoice.status;
  const due = invoice.dueDate ? new Date(invoice.dueDate) : null;
  if (due && due.getTime() < new Date(now).getTime()) return 'overdue';
  return invoice.status;
};

const pad = (value, size) => String(value).padStart(size, '0');

const makeInvoiceNumber = ({ prefix = 'INV', date = new Date(), sequence = 1 } = {}) => {
  const d = new Date(date);
  const stamp = `${String(d.getFullYear()).slice(-2)}${pad(d.getMonth() + 1, 2)}`;
  return `${prefix}-${stamp}-${pad(Math.max(Math.floor(sequence), 1), 4)}`;
};

const REVENUE_SOURCE_BY_INVOICE_TYPE = {
  commission: 'commission',
  advertising: 'advertising',
  subscription: 'subscription',
  service_fee: 'service_fee',
  other: 'other',
};

const groupRevenue = (entries = []) => {
  const bySource = {};
  let total = 0;
  for (const entry of entries) {
    const amount = Number(entry.amount) || 0;
    total = round2(total + amount);
    const source = entry.source || 'other';
    bySource[source] = round2((bySource[source] || 0) + amount);
  }
  return { total, bySource };
};

const monthlyRevenue = (entries = [], { months = 6, now = new Date() } = {}) => {
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const series = {};
  for (let i = 0; i < months; i += 1) {
    const key = monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1));
    series[key] = { month: key, total: 0 };
  }
  for (const entry of entries) {
    const key = monthKey(entry.occurredAt || entry.createdAt || now);
    if (!series[key]) continue;
    series[key].total = round2(series[key].total + (Number(entry.amount) || 0));
  }
  return Object.values(series).sort((a, b) => a.month.localeCompare(b.month));
};

module.exports = {
  round2,
  canInvoiceTransition,
  invoiceTotals,
  effectiveStatus,
  makeInvoiceNumber,
  groupRevenue,
  monthlyRevenue,
  REVENUE_SOURCE_BY_INVOICE_TYPE,
};
