const { auth } = require('./auth');

// Sub-admin roles (RBAC) as defined in the spec:
// support, content_moderator, finance_officer. 'admin' (super) always wins.
const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

const ROLE_PERMISSIONS = {
  'users.view': ['admin', 'support'],
  'stats.view': ['admin', 'support', 'content_moderator', 'finance_officer'],
  'users.verify': ['admin', 'support'],
  'users.suspend': ['admin', 'support'],
  'users.create': ['admin'],
  'users.edit': ['admin', 'support'],
  'users.delete': ['admin'],
  'content.moderate': ['admin', 'content_moderator'],
  'content.manage': ['admin', 'content_moderator'],
  'market.prices': ['admin', 'content_moderator', 'finance_officer'],
  'loans.moderate': ['admin', 'finance_officer'],
  'loans.repayment': ['admin', 'finance_officer'],
  'disputes.resolve': ['admin', 'support'],
  'reports.view': ['admin', 'finance_officer'],
  'weather.manage': ['admin'],
  'admin.only': ['admin'],
};

const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      await auth(req, res, () => {
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ message: 'Huna ruhusa ya kufanya kitendo hiki' });
        }
        next();
      });
    } catch (error) {
      res.status(401).json({ message: 'Tokeni siyo sahihi' });
    }
  };
};

const requirePermission = (permission) => {
  const allowed = ROLE_PERMISSIONS[permission] || [];
  return requireRole(...allowed);
};

const requireOwnershipOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      await auth(req, res, async () => {
        if (req.user.role === 'admin') return next();

        const ownerId = await getResourceOwnerId(req);
        if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Huna ruhusa ya kufanya kitendo hiki' });
        }
        next();
      });
    } catch (error) {
      res.status(401).json({ message: 'Tokeni siyo sahihi' });
    }
  };
};

module.exports = { requireRole, requirePermission, requireOwnershipOrAdmin, ROLE_PERMISSIONS, STAFF_ROLES };
