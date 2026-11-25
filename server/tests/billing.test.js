const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canInvoiceTransition,
  invoiceTotals,
  effectiveStatus,
  makeInvoiceNumber,
  groupRevenue,
  monthlyRevenue,
} = require('../services/billing.service');

test('invoice totals apply tax on the line-item subtotal', () => {
  const totals = invoiceTotals({
    lineItems: [
      { description: 'Service fee', quantity: 2, unitPrice: 5000 },
      { description: 'Advert', quantity: 1, unitPrice: 10000.555 },
    ],
    taxRate: 18,
  });
  assert.equal(totals.subtotal, 20000.56);
  assert.equal(totals.taxAmount, 3600.1);
  assert.equal(totals.totalAmount, 23600.66);
  assert.equal(totals.items[0].amount, 10000);
});

test('overdue is derived from the due date without changing stored status', () => {
  const issued = { status: 'issued', dueDate: '2026-01-10' };
  assert.equal(effectiveStatus(issued, new Date('2026-01-20')), 'overdue');
  assert.equal(effectiveStatus(issued, new Date('2026-01-05')), 'issued');
  assert.equal(effectiveStatus({ status: 'paid', dueDate: '2026-01-10' }, new Date('2026-02-01')), 'paid');
});

test('invoice lifecycle is linear and void is always terminal for drafts', () => {
  assert.equal(canInvoiceTransition('draft', 'issued'), true);
  assert.equal(canInvoiceTransition('issued', 'paid'), true);
  assert.equal(canInvoiceTransition('draft', 'paid'), false);
  assert.equal(canInvoiceTransition('paid', 'void'), false);
  assert.equal(canInvoiceTransition('void', 'issued'), false);
});

test('invoice numbers carry the month and a padded sequence', () => {
  assert.equal(makeInvoiceNumber({ date: new Date(2026, 1, 15), sequence: 7 }), 'INV-2602-0007');
  assert.equal(makeInvoiceNumber({ sequence: 0 }), makeInvoiceNumber({ sequence: 1 }));
});

test('revenue groups by source and zero-fills the monthly series', () => {
  const entries = [
    { source: 'commission', amount: 1000, occurredAt: new Date(2026, 0, 10) },
    { source: 'commission', amount: 500, occurredAt: new Date(2026, 0, 11) },
    { source: 'advertising', amount: 2000, occurredAt: new Date(2026, 1, 3) },
  ];
  assert.deepEqual(groupRevenue(entries), {
    total: 3500,
    bySource: { commission: 1500, advertising: 2000 },
  });

  const series = monthlyRevenue(entries, { months: 3, now: new Date(2026, 2, 1) });
  assert.deepEqual(series.map((row) => row.month), ['2026-01', '2026-02', '2026-03']);
  assert.deepEqual(series.map((row) => row.total), [1500, 2000, 0]);
});
