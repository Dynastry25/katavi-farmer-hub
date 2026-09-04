const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.get('/stats', requireAdmin, ctrl.getStats);

router.get('/users', requireAdmin, ctrl.getUsers);
router.get('/users/:id', requireAdmin, ctrl.getUser);
router.post('/users', requireAdmin, ctrl.createUser);
router.put('/users/:id', requireAdmin, ctrl.updateUser);
router.put('/users/:id/role', requireAdmin, ctrl.updateUserRole);
router.put('/users/:id/suspend', requireAdmin, ctrl.suspendUser);
router.delete('/users/:id', requireAdmin, ctrl.deleteUser);

router.get('/crops', requireAdmin, ctrl.getCrops);
router.put('/crops/:id/moderate', requireAdmin, ctrl.moderateCrop);

router.get('/market-prices', requireAdmin, ctrl.getMarketPrices);
router.post('/market-prices', requireAdmin, ctrl.createMarketPrice);
router.put('/market-prices/:id', requireAdmin, ctrl.updateMarketPrice);
router.delete('/market-prices/:id', requireAdmin, ctrl.deleteMarketPrice);

router.get('/loans', requireAdmin, ctrl.getLoanApplications);
router.put('/loans/:id/moderate', requireAdmin, ctrl.moderateLoan);

router.get('/groups', requireAdmin, ctrl.getGroups);
router.get('/ratings', requireAdmin, ctrl.getRatings);

router.get('/notifications', requireAdmin, ctrl.getNotifications);
router.post('/notifications/broadcast', requireAdmin, ctrl.broadcastNotification);

router.get('/disputes', requireAdmin, ctrl.getDisputes);

router.get('/audit-logs', requireAdmin, ctrl.getAuditLogs);

module.exports = router;
