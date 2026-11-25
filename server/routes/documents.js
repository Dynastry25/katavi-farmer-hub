const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const BuiltDocument = require('../models/GeneratedDocument');
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');
const { STAFF_ROLES } = require('../middleware/roleCheck');
const queue = require('../services/jobQueue.service');
const { getEarningsSummary } = require('../services/earnings.service');
const { effectiveStatus } = require('../services/billing.service');

const money = (value) => `TZS ${(Number(value) || 0).toLocaleString('en-US')}`;
const today = () => new Date().toISOString().slice(0, 10);

const earningsLines = async (user) => {
  const summary = await getEarningsSummary(user._id);
  return [
    `Mmiliki: ${user.name || ''}`,
    `Imetengenezwa: ${today()}`,
    '',
    `Jumla iliyolipwa: ${money(summary.totals.paid)}`,
    `Inayosubiri malipo: ${money(summary.totals.pending)}`,
    `Idadi ya miamala: ${summary.totals.count}`,
    '',
    'MODULI ZA MAPATO',
    ...(summary.modules.length
      ? summary.modules.map((module) => (
        `${module.label || module.key}: imelipwa ${money(module.paid)} | inasubiri ${money(module.pending)} | ${module.count}`
      ))
      : ['Hakuna moduli yenye mapato bado.']),
    '',
    'MIEZI YA KARIBUNI',
    ...summary.monthly.map((row) => (
      `${row.month}: malipo ${money(row.payments)} | marejesho ${money(row.refunds)} | halisi ${money(row.net)}`
    )),
  ];
};

const invoiceLines = (invoice) => [
  `Ankara: ${invoice.number}`,
  `Mteja: ${invoice.customerName}`,
  `Tarehe: ${today()}`,
  `Hali: ${effectiveStatus(invoice)}`,
  '',
  'VITU',
  ...invoice.lineItems.map((item) => (
    `${item.description} x ${item.quantity} @ ${money(item.unitPrice)} = ${money(item.amount)}`
  )),
  '',
  `Jumla ndogo: ${money(invoice.subtotal)}`,
  `Kodi (${invoice.taxRate}%): ${money(invoice.taxAmount)}`,
  `JUMLA: ${money(invoice.totalAmount)}`,
];

// POST /api/v1/documents { type: 'earnings' | 'invoice', invoiceId?, months? }
router.post('/', auth, async (req, res) => {
  try {
    const type = String(req.body.type || '');
    let lines;
    let title;
    let filename;

    if (type === 'earnings') {
      title = 'Ripoti ya Mapato';
      filename = `mapato-${today()}.pdf`;
      lines = await earningsLines(req.user);
    } else if (type === 'invoice') {
      const invoice = mongoose.isValidObjectId(req.body.invoiceId)
        ? await Invoice.findById(req.body.invoiceId)
        : null;
      if (!invoice) return res.status(404).json({ message: 'Ankara haipatikani' });
      const isCustomer = invoice.customer && String(invoice.customer) === String(req.user._id);
      if (!isCustomer && !STAFF_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: 'Huna ruhusa ya kupakua ankara hii' });
      }
      title = `Ankara ${invoice.number}`;
      filename = `ankara-${invoice.number}.pdf`;
      lines = invoiceLines(invoice);
    } else {
      return res.status(400).json({ message: 'Aina ya nyaraka haitumiki' });
    }

    const job = await queue.enqueue({
      type: 'pdf',
      createdBy: req.user._id,
      payload: {
        ownerId: String(req.user._id),
        documentType: type,
        title,
        filename,
        lines,
      },
    });

    res.status(202).json({
      message: 'Nyaraka inatengenezwa; pakua baada ya sekunde chache',
      job: { id: job._id, status: job.status },
    });
  } catch (error) {
    console.error('Request document error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/documents/my — generated document metadata
router.get('/my', auth, async (req, res) => {
  try {
    const documents = await BuiltDocument.find({ owner: req.user._id })
      .select('-data')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(documents);
  } catch (error) {
    console.error('My documents error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/documents/:id — stream the PDF to its owner or staff
router.get('/:id', auth, async (req, res) => {
  try {
    const document = mongoose.isValidObjectId(req.params.id)
      ? await BuiltDocument.findById(req.params.id)
      : null;
    if (!document) return res.status(404).json({ message: 'Nyaraka haipatikani' });
    if (String(document.owner) !== String(req.user._id) && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kupakua nyaraka hii' });
    }

    res.setHeader('Content-Type', document.mime || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.filename.replace(/"/g, '')}"`);
    res.setHeader('Content-Length', document.data.length);
    res.send(document.data);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
