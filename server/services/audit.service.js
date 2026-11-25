const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const buildEntry = (req, entry = {}) => {
  const user = req.user || {};
  const targetId = entry.targetId && mongoose.isValidObjectId(entry.targetId)
    ? entry.targetId
    : undefined;

  return {
    user: entry.userId || user._id || null,
    userName: entry.userName || user.name || entry.actorName || 'system',
    userRole: entry.userRole || user.role || entry.actorRole || 'system',
    action: entry.action || 'unknown',
    category: entry.category || 'system',
    targetType: entry.targetType || '',
    targetId,
    details: entry.details || {},
    ipAddress: req.ip || '',
    userAgent: String((req.get && req.get('user-agent')) || '').slice(0, 300),
  };
};

// Audit writes must never break a business operation or slow its response:
// failures are logged and swallowed.
const audit = (req, entry = {}) => AuditLog.create(buildEntry(req, entry)).catch((error) => {
  console.error(`[audit] Failed to record "${entry.action || 'unknown'}":`, error.message);
});

const resolve = (value, req, res, fallback) => (
  typeof value === 'function' ? value(req, res) : (value ?? fallback)
);

// Route-level audit: records the action once the handler has answered 2xx, so
// validation failures and permission denials are not written as successes.
const auditRoute = (options = {}) => (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    try {
      audit(req, {
        action: resolve(options.action, req, res, 'unknown'),
        category: options.category || 'system',
        targetType: options.targetType || '',
        targetId: options.targetId
          ? resolve(options.targetId, req, res)
          : req.params?.[options.targetIdParam || 'id'],
        details: resolve(options.details, req, res, {}) || {},
        actorName: options.actorName,
        actorRole: options.actorRole,
      });
    } catch (error) {
      console.error('[audit] Route hook failed:', error.message);
    }
  });
  next();
};

module.exports = { audit, auditRoute };
