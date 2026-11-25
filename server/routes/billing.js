const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Invoice = require('../models/Invoice');
const PlatformRevenue = require('../models/PlatformRevenue');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const {
  round2,
  canInvoiceTransition,
  invoiceTotals,
  effectiveStatus,
  makeInvoiceNumber,
  groupRevenue,
  monthlyRevenue,
  REVENUE_SOURCE_BY_INVOICE_TYPE,
} = require('../services/billing.service');
const { monthKey } = require('../services/financePlan.service');

const billingRoles = requireRole('admin', 'finance_officer');

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'system', ...payload });
  } catch (e) { /* best effort */ }
};

const money = (value) => `TZS ${(Number(value) || 0).toLocaleString('en-US')}`;

const withStatus = (invoice, now = new Date()) => ({
  ...(invoice.toObject ? invoice.toObject() : invoice),
  effectiveStatus: effectiveStatus(invoice, now),
});

const findInvoice = async (req, res) => {
  const invoice = mongoose.isValidObjectId(req.params.id)
    ? await Invoice.findById(req.params.id)
    : null;
  if (!invoice) {
    res.status(404).json({ message: 'Ankara haipatikani' });
    return null;
  }
  return invoice;
};

// GET /api/v1/billing/invoices/my — invoices addressed to the caller
router.get('/invoices/my', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ customer: req.user._id, status: { $ne: 'draft' } })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(invoices.map((invoice) => withStatus(invoice)));
  } catch (error) {
    console.error('My invoices error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/billing/invoices — finance staff billing register
router.get('/invoices', billingRoles, async (req, res) => {
  try {
    const filter = {};
    if (['draft', 'issued', 'paid', 'void'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.customer && mongoose.isValidObjectId(req.query.customer)) filter.customer = req.query.customer;

    let invoices = await Invoice.find(filter).sort({ createdAt: -1 }).limit(300);
    if (req.query.status === 'overdue') {
      const now = new Date();
      invoices = invoices.filter((invoice) => effectiveStatus(invoice, now) === 'overdue');
    }
    res.json(invoices.map((invoice) => withStatus(invoice)));
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/billing/invoices — finance staff raise an invoice
router.post('/invoices', billingRoles, auditRoute({
  action: 'create_invoice',
  category: 'finance',
  targetType: 'Invoice',
  targetId: (req, res) => res.locals.invoiceId,
}), async (req, res) => {
  try {
    const body = req.body || {};
    const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
    if (!lineItems.length || lineItems.every((item) => !Number(item.unitPrice) && !Number(item.quantity))) {
      return res.status(400).json({ message: 'Ankara inahitaji angalau kipengele kimoja cha bei' });
    }

    let customer = null;
    if (body.customerId && mongoose.isValidObjectId(body.customerId)) {
      customer = await User.findById(body.customerId).select('name email').lean();
      if (!customer) return res.status(404).json({ message: 'Mteja hapatikani' });
    } else if (body.customerEmail) {
      customer = await User.findOne({ email: String(body.customerEmail).toLowerCase().trim() })
        .select('name email').lean();
    }
    const customerName = String(body.customerName || customer?.name || '').trim();
    if (customerName.length < 2) {
      return res.status(400).json({ message: 'Jina la mteja linahitajika' });
    }

    const totals = invoiceTotals({ lineItems, taxRate: body.taxRate });
    if (totals.totalAmount <= 0) {
      return res.status(400).json({ message: 'Jumla ya ankara lazima iwe zaidi ya sifuri' });
    }

    const now = new Date();
    let invoice = null;
    for (let attempt = 0; attempt < 10 && !invoice; attempt += 1) {
      const stamp = makeInvoiceNumber({ date: now, sequence: 1 }).split('-').slice(0, 2).join('-');
      const count = await Invoice.countDocuments({ number: new RegExp(`^${stamp}-`) });
      try {
        invoice = await Invoice.create({
          number: makeInvoiceNumber({ date: now, sequence: count + 1 + attempt }),
          type: body.type,
          customer: customer?._id || null,
          customerName: customerName.slice(0, 160),
          customerEmail: String(body.customerEmail || customer?.email || '').slice(0, 160),
          lineItems: totals.items,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: String(body.notes || '').slice(0, 1000),
          createdBy: req.user._id,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    if (!invoice) {
      return res.status(503).json({ message: 'Imeshindikana kutengeneza namba ya ankara, jaribu tena' });
    }

    res.locals.invoiceId = String(invoice._id);
    res.status(201).json(withStatus(invoice));
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za ankara si sahihi' });
    }
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/billing/invoices/:id — staff, or the billed customer
router.get('/invoices/:id', auth, async (req, res) => {
  try {
    const invoice = await findInvoice(req, res);
    if (!invoice) return;
    const isCustomer = invoice.customer && String(invoice.customer) === String(req.user._id);
    const isStaff = ['admin', 'finance_officer'].includes(req.user.role);
    if (!isCustomer && !isStaff) {
      return res.status(403).json({ message: 'Huna ruhusa kuona ankara hii' });
    }
    if (!isStaff && invoice.status === 'draft') {
      return res.status(404).json({ message: 'Ankara haipatikani' });
    }
    res.json(withStatus(invoice));
  } catch (error) {
    console.error('Invoice detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/billing/invoices/:id/status — issue, pay or void an invoice
router.patch('/invoices/:id/status', billingRoles, auditRoute({
  action: 'update_invoice_status',
  category: 'finance',
  targetType: 'Invoice',
}), async (req, res) => {
  try {
    const invoice = await findInvoice(req, res);
    if (!invoice) return;

    const next = String(req.body.status || '');
    const current = effectiveStatus(invoice);
    const baseStatus = current === 'overdue' ? 'issued' : current;
    if (!canInvoiceTransition(baseStatus, next)) {
      return res.status(400).json({
        message: `Ankara yenye hali "${current}" haiwezi kuwa "${next}"`,
      });
    }

    const now = new Date();
    invoice.status = next;
    if (next === 'issued') {
      invoice.issuedAt = now;
      if (!invoice.dueDate) invoice.dueDate = new Date(now.getTime() + 14 * 86400000);
    }
    if (next === 'paid') {
      invoice.paidAt = now;
      invoice.paymentReference = String(req.body.reference || '').slice(0, 120);
      await PlatformRevenue.updateOne(
        { reference: `invoice:${invoice._id}` },
        {
          $setOnInsert: {
            source: REVENUE_SOURCE_BY_INVOICE_TYPE[invoice.type] || 'other',
            amount: invoice.totalAmount,
            description: `Ankara ${invoice.number} — ${invoice.customerName}`,
            invoice: invoice._id,
            recordedBy: req.user._id,
            occurredAt: now,
          },
        },
        { upsert: true },
      );
    }
    if (next === 'void') invoice.voidedAt = now;
    await invoice.save();

    if (invoice.customer) {
      const messages = {
        issued: `Ankara ${invoice.number} ya ${money(invoice.totalAmount)} imetumwa kwako.`,
        paid: `Malipo ya ankara ${invoice.number} (${money(invoice.totalAmount)}) yamepokelewa. Asante.`,
        void: `Ankara ${invoice.number} imebatilishwa.`,
      };
      await notify(invoice.customer, {
        title: 'Taarifa ya Ankara',
        message: messages[next] || `Ankara ${invoice.number} sasa ni ${next}.`,
        link: '/billing',
        metadata: { invoiceId: invoice._id, status: next },
      });
    }

    res.json(withStatus(invoice));
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/billing/revenue — record platform revenue manually
router.post('/revenue', billingRoles, auditRoute({
  action: 'record_platform_revenue',
  category: 'finance',
  targetType: 'PlatformRevenue',
}), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!(amount > 0)) {
      return res.status(400).json({ message: 'Kiasi cha mapato kinahitajika' });
    }
    const reference = String(req.body.reference || '').trim()
      || `manual:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

    const entry = await PlatformRevenue.create({
      reference,
      source: req.body.source || 'other',
      amount: round2(amount),
      description: String(req.body.description || '').slice(0, 500),
      recordedBy: req.user._id,
      occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
    });
    res.status(201).json(entry);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Rejeleo hili la mapato limeshatumika' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za mapato si sahihi' });
    }
    console.error('Record platform revenue error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/billing/revenue?months=6&source=commission
router.get('/revenue', billingRoles, async (req, res) => {
  try {
    const months = Math.max(1, Math.min(24, parseInt(req.query.months) || 6));
    const start = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1);
    const filter = { occurredAt: { $gte: start } };
    if (req.query.source) filter.source = req.query.source;

    const entries = await PlatformRevenue.find(filter).sort({ occurredAt: -1 }).limit(1000).lean();
    res.json({
      period: { from: start, to: new Date(), months },
      entries: entries.slice(0, 200),
      summary: groupRevenue(entries),
      monthly: monthlyRevenue(entries, { months }),
    });
  } catch (error) {
    console.error('Platform revenue report error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/billing/summary — billing KPIs for the finance desk
router.get('/summary', billingRoles, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [outstanding, paidThisMonth, revenue] = await Promise.all([
      Invoice.find({ status: 'issued' }).select('totalAmount dueDate').lean(),
      Invoice.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      PlatformRevenue.find({ occurredAt: { $gte: yearStart } }).lean(),
    ]);

    const overdue = outstanding
      .map((invoice) => effectiveStatus(invoice, now))
      .filter((status) => status === 'overdue').length;

    res.json({
      outstanding: {
        count: outstanding.length,
        total: round2(outstanding.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0)),
        overdue,
      },
      paidThisMonth: {
        count: paidThisMonth[0]?.count || 0,
        total: round2(paidThisMonth[0]?.total || 0),
        month: monthKey(now),
      },
      revenueYear: groupRevenue(revenue),
    });
  } catch (error) {
    console.error('Billing summary error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
