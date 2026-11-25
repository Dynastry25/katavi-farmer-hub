const test = require('node:test');
const assert = require('node:assert/strict');
const {
  monthKey,
  isMonthKey,
  monthBounds,
  budgetVariance,
  debtBalance,
  debtSummary,
  debtTotals,
} = require('../services/financePlan.service');

test('month helpers accept YYYY-MM and fall back safely', () => {
  assert.equal(monthKey('2026-02-15T10:00:00Z') !== undefined, true);
  assert.equal(isMonthKey('2026-02'), true);
  assert.equal(isMonthKey('2026-13'), false);
  const bounds = monthBounds('2026-02');
  assert.equal(bounds.key, '2026-02');
  assert.equal(bounds.from.getMonth(), 1);
  assert.equal(bounds.to.getMonth(), 2);
});

test('budget variance flags over, under and unbudgeted spending', () => {
  const result = budgetVariance(
    [
      { category: 'inputs', amount: 10000 },
      { category: 'labor', amount: 5000 },
    ],
    { inputs: 12000, transport: 2000 },
  );
  const byCategory = Object.fromEntries(result.items.map((row) => [row.category, row]));
  assert.equal(byCategory.inputs.status, 'over');
  assert.equal(byCategory.inputs.variance, -2000);
  assert.equal(byCategory.labor.status, 'under');
  assert.equal(byCategory.transport.status, 'unbudgeted');
  assert.equal(byCategory.seeds.status, 'idle');
  assert.deepEqual(result.totals, { planned: 15000, actual: 14000, variance: 1000, overBudget: false });
});

test('debt balance and overdue status follow recorded payments', () => {
  const debt = {
    principal: 10000,
    payments: [{ amount: 4000 }, { amount: 1000 }],
    dueDate: '2026-01-01',
    status: 'open',
  };
  assert.equal(debtBalance(debt), 5000);
  const summary = debtSummary(debt, new Date('2026-02-01'));
  assert.equal(summary.status, 'overdue');
  assert.equal(summary.daysOverdue, 31);
  assert.equal(summary.balance, 5000);
});

test('fully paid debts settle and totals split payables from receivables', () => {
  const settled = {
    principal: 2000,
    payments: [{ amount: 2000 }],
    type: 'payable',
    status: 'open',
  };
  assert.equal(debtSummary(settled).status, 'settled');

  const totals = debtTotals([
    { principal: 5000, payments: [], type: 'payable', dueDate: '2026-01-01' },
    { principal: 3000, payments: [], type: 'receivable' },
    settled,
  ], new Date('2026-02-01'));
  assert.equal(totals.payable, 5000);
  assert.equal(totals.receivable, 3000);
  assert.equal(totals.overdue, 5000);
  assert.equal(totals.settled, 1);
});
