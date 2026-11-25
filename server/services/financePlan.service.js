const EXPENSE_CATEGORIES = ['inputs', 'labor', 'seeds', 'transport', 'equipment', 'other'];

const pad = (value) => String(value).padStart(2, '0');

const monthKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const isMonthKey = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ''));

// Calendar boundaries for a YYYY-MM label; falls back to the current month.
const monthBounds = (month) => {
  const key = isMonthKey(month) ? String(month) : monthKey();
  const [year, mon] = key.split('-').map(Number);
  const from = new Date(year, mon - 1, 1);
  const to = new Date(year, mon, 1);
  return { key, from, to };
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Compares what the farmer planned to spend with what they actually spent.
const budgetVariance = (items = [], actualByCategory = {}) => {
  const planned = {};
  for (const item of items) {
    const category = EXPENSE_CATEGORIES.includes(item.category) ? item.category : 'other';
    planned[category] = (planned[category] || 0) + (Number(item.amount) || 0);
  }
  const rows = EXPENSE_CATEGORIES.map((category) => {
    const plannedAmount = round2(planned[category] || 0);
    const actualAmount = round2(actualByCategory[category] || 0);
    const variance = round2(plannedAmount - actualAmount);
    return {
      category,
      planned: plannedAmount,
      actual: actualAmount,
      variance,
      status: plannedAmount === 0
        ? (actualAmount > 0 ? 'unbudgeted' : 'idle')
        : (actualAmount > plannedAmount ? 'over' : 'under'),
    };
  });
  const totals = rows.reduce((acc, row) => ({
    planned: round2(acc.planned + row.planned),
    actual: round2(acc.actual + row.actual),
  }), { planned: 0, actual: 0 });
  return {
    items: rows,
    totals: {
      ...totals,
      variance: round2(totals.planned - totals.actual),
      overBudget: totals.actual > totals.planned,
    },
  };
};

const debtPaid = (debt = {}) => round2(
  (debt.payments || []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
);

const debtBalance = (debt = {}) => round2(Math.max(
  (Number(debt.principal) || 0) - debtPaid(debt),
  0,
));

// A debt is overdue once its due date has passed with a positive balance.
const debtSummary = (debt = {}, now = new Date()) => {
  const paid = debtPaid(debt);
  const balance = debtBalance(debt);
  const settled = debt.status === 'settled' || balance === 0;
  const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
  const overdue = !settled && dueDate && dueDate.getTime() < new Date(now).getTime();
  const daysOverdue = overdue
    ? Math.ceil((new Date(now).getTime() - dueDate.getTime()) / 86400000)
    : 0;
  return {
    paid,
    balance,
    status: settled ? 'settled' : overdue ? 'overdue' : 'open',
    daysOverdue,
  };
};

const debtTotals = (debts = [], now = new Date()) => {
  const totals = { payable: 0, receivable: 0, overdue: 0, settled: 0 };
  for (const debt of debts) {
    const summary = debtSummary(debt, now);
    if (summary.status === 'settled') {
      totals.settled += 1;
      continue;
    }
    if (debt.type === 'receivable') totals.receivable = round2(totals.receivable + summary.balance);
    else totals.payable = round2(totals.payable + summary.balance);
    if (summary.status === 'overdue') totals.overdue = round2(totals.overdue + summary.balance);
  }
  return totals;
};

module.exports = {
  EXPENSE_CATEGORIES,
  monthKey,
  isMonthKey,
  monthBounds,
  round2,
  budgetVariance,
  debtPaid,
  debtBalance,
  debtSummary,
  debtTotals,
};
