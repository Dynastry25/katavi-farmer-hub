const { auth } = require('./auth');

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

module.exports = { requireRole, requireOwnershipOrAdmin };
