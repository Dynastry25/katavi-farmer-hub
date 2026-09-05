const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/roleCheck');
const ctrl = require('../controllers/admin.controller');

router.get('/stats', requirePermission('stats.view'), ctrl.getStats);

router.get('/users', requirePermission('users.view'), ctrl.getUsers);
router.get('/users/:id', requirePermission('users.view'), ctrl.getUser);
router.post('/users', requirePermission('users.create'), ctrl.createUser);
router.put('/users/:id', requirePermission('users.edit'), ctrl.updateUser);
router.put('/users/:id/role', requirePermission('users.edit'), ctrl.updateUserRole);
router.put('/users/:id/suspend', requirePermission('users.suspend'), ctrl.suspendUser);
router.put('/users/:id/verify', requirePermission('users.verify'), ctrl.verifyUser);
router.delete('/users/:id', requirePermission('users.delete'), ctrl.deleteUser);

router.get('/crops', requirePermission('content.manage'), ctrl.getCrops);
router.put('/crops/:id/moderate', requirePermission('content.moderate'), ctrl.moderateCrop);

router.get('/advice', requirePermission('content.moderate'), ctrl.getAdvice);
router.put('/advice/:id/moderate', requirePermission('content.moderate'), ctrl.moderateAdvice);

router.get('/news', requirePermission('content.moderate'), ctrl.getNewsAdmin);
router.put('/news/:id/moderate', requirePermission('content.moderate'), ctrl.moderateNews);

router.get('/market-prices', requirePermission('market.prices'), ctrl.getMarketPrices);
router.post('/market-prices', requirePermission('market.prices'), ctrl.createMarketPrice);
router.put('/market-prices/:id', requirePermission('market.prices'), ctrl.updateMarketPrice);
router.delete('/market-prices/:id', requirePermission('market.prices'), ctrl.deleteMarketPrice);

router.get('/loans', requirePermission('loans.moderate'), ctrl.getLoanApplications);
router.put('/loans/:id/moderate', requirePermission('loans.moderate'), ctrl.moderateLoan);
router.put('/loans/:id/repayment', requirePermission('loans.repayment'), ctrl.updateLoanRepayment);

router.get('/groups', requirePermission('admin.only'), ctrl.getGroups);
router.get('/ratings', requirePermission('admin.only'), ctrl.getRatings);

router.get('/notifications', requirePermission('admin.only'), ctrl.getNotifications);
router.post('/notifications/broadcast', requirePermission('admin.only'), ctrl.broadcastNotification);

router.get('/disputes', requirePermission('disputes.resolve'), ctrl.getDisputes);
router.put('/disputes/:id/resolve', requirePermission('disputes.resolve'), ctrl.resolveDispute);

router.get('/audit-logs', requirePermission('admin.only'), ctrl.getAuditLogs);

router.get('/settings', requirePermission('admin.only'), ctrl.getSettings);
router.put('/settings', requirePermission('admin.only'), ctrl.updateSettings);

module.exports = router;