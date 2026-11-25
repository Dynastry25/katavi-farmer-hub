const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/roleCheck');
const ctrl = require('../controllers/admin.controller');
const s = require('../controllers/adminShamba.controller');
const upload = require('../middleware/upload');
const uploadApk = require('../middleware/uploadApk');
const { auditRoute } = require('../services/audit.service');

// ---- Shamba Assistant reference dataset (admin-curated) ----
router.get('/shamba/land', requirePermission('content.manage'), s.getLandGuidance);
router.post('/shamba/land', requirePermission('content.manage'), auditRoute({ action: 'create_land_guidance', category: 'content', targetType: 'ShambaGuidance' }), s.createLandGuidance);
router.put('/shamba/land/:id', requirePermission('content.manage'), auditRoute({ action: 'update_land_guidance', category: 'content', targetType: 'ShambaGuidance' }), s.updateLandGuidance);
router.delete('/shamba/land/:id', requirePermission('content.manage'), auditRoute({ action: 'delete_land_guidance', category: 'content', targetType: 'ShambaGuidance' }), s.deleteLandGuidance);

router.get('/shamba/cycles', requirePermission('content.manage'), s.getCropCycles);
router.post('/shamba/cycles', requirePermission('content.manage'), auditRoute({ action: 'upsert_crop_cycle', category: 'content', targetType: 'CropCycle' }), s.upsertCropCycle);
router.delete('/shamba/cycles/:id', requirePermission('content.manage'), auditRoute({ action: 'delete_crop_cycle', category: 'content', targetType: 'CropCycle' }), s.deleteCropCycle);

router.get('/shamba/diseases', requirePermission('content.manage'), s.getDiseases);
router.post('/shamba/diseases', requirePermission('content.manage'), auditRoute({ action: 'create_disease', category: 'content', targetType: 'CropDisease' }), s.createDisease);
router.put('/shamba/diseases/:id', requirePermission('content.manage'), auditRoute({ action: 'update_disease', category: 'content', targetType: 'CropDisease' }), s.updateDisease);
router.delete('/shamba/diseases/:id', requirePermission('content.manage'), auditRoute({ action: 'delete_disease', category: 'content', targetType: 'CropDisease' }), s.deleteDisease);

router.get('/stats', requirePermission('stats.view'), ctrl.getStats);

router.get('/users', requirePermission('users.view'), ctrl.getUsers);
router.get('/users/:id', requirePermission('users.view'), ctrl.getUser);
router.post('/users', requirePermission('users.create'), auditRoute({
  action: 'create_user',
  category: 'user',
  targetType: 'User',
  details: (req) => ({ role: String(req.body?.role || '').slice(0, 20) }),
}), ctrl.createUser);
router.put('/users/:id', requirePermission('users.edit'), auditRoute({
  action: 'update_user',
  category: 'user',
  targetType: 'User',
  details: (req) => ({ fields: Object.keys(req.body || {}).slice(0, 20) }),
}), ctrl.updateUser);
router.put('/users/:id/role', requirePermission('users.edit'), auditRoute({
  action: 'change_user_role',
  category: 'user',
  targetType: 'User',
  details: (req) => ({ role: String(req.body?.role || '').slice(0, 20) }),
}), ctrl.updateUserRole);
router.put('/users/:id/suspend', requirePermission('users.suspend'), auditRoute({ action: 'suspend_user', category: 'user', targetType: 'User' }), ctrl.suspendUser);
router.put('/users/:id/verify', requirePermission('users.verify'), auditRoute({ action: 'verify_user', category: 'user', targetType: 'User' }), ctrl.verifyUser);
router.delete('/users/:id', requirePermission('users.delete'), auditRoute({ action: 'delete_user', category: 'user', targetType: 'User' }), ctrl.deleteUser);

router.get('/crops', requirePermission('content.manage'), ctrl.getCrops);
router.put('/crops/:id/moderate', requirePermission('content.moderate'), auditRoute({ action: 'moderate_crop', category: 'moderation', targetType: 'Crop' }), ctrl.moderateCrop);

router.get('/advice', requirePermission('content.moderate'), ctrl.getAdvice);
router.put('/advice/:id/moderate', requirePermission('content.moderate'), auditRoute({ action: 'moderate_advice', category: 'moderation', targetType: 'Advice' }), ctrl.moderateAdvice);

router.get('/news', requirePermission('content.moderate'), ctrl.getNewsAdmin);
router.put('/news/:id/moderate', requirePermission('content.moderate'), auditRoute({ action: 'moderate_news', category: 'moderation', targetType: 'News' }), ctrl.moderateNews);

router.get('/market-prices', requirePermission('market.prices'), ctrl.getMarketPrices);
router.post('/market-prices', requirePermission('market.prices'), auditRoute({
  action: 'create_market_price',
  category: 'market',
  targetType: 'MarketPrice',
  details: (req) => ({ cropName: String(req.body?.cropName || '').slice(0, 80) }),
}), ctrl.createMarketPrice);
router.put('/market-prices/:id', requirePermission('market.prices'), auditRoute({ action: 'update_market_price', category: 'market', targetType: 'MarketPrice' }), ctrl.updateMarketPrice);
router.delete('/market-prices/:id', requirePermission('market.prices'), auditRoute({ action: 'delete_market_price', category: 'market', targetType: 'MarketPrice' }), ctrl.deleteMarketPrice);

router.get('/loans', requirePermission('loans.moderate'), ctrl.getLoanApplications);
router.put('/loans/:id/moderate', requirePermission('loans.moderate'), auditRoute({ action: 'moderate_loan', category: 'loan', targetType: 'LoanApplication' }), ctrl.moderateLoan);
router.put('/loans/:id/repayment', requirePermission('loans.repayment'), auditRoute({ action: 'record_loan_repayment', category: 'loan', targetType: 'LoanApplication' }), ctrl.updateLoanRepayment);

router.get('/groups', requirePermission('admin.only'), ctrl.getGroups);
router.get('/ratings', requirePermission('admin.only'), ctrl.getRatings);

router.get('/notifications', requirePermission('admin.only'), ctrl.getNotifications);
router.post('/notifications/broadcast', requirePermission('admin.only'), auditRoute({
  action: 'broadcast_notification',
  category: 'notification',
  targetType: 'Notification',
  details: (req) => ({ audience: String(req.body?.audience || req.body?.role || 'all').slice(0, 40) }),
}), ctrl.broadcastNotification);
router.get('/broadcasts', requirePermission('admin.only'), ctrl.getBroadcasts);
router.delete('/broadcasts/:id', requirePermission('admin.only'), auditRoute({ action: 'delete_broadcast', category: 'notification', targetType: 'Notification' }), ctrl.deleteBroadcast);

router.get('/disputes', requirePermission('disputes.resolve'), ctrl.getDisputes);
router.put('/disputes/:id/resolve', requirePermission('disputes.resolve'), auditRoute({
  action: 'resolve_dispute',
  category: 'dispute',
  targetType: 'Dispute',
  details: (req) => ({ resolution: String(req.body?.resolution || req.body?.status || '').slice(0, 40) }),
}), ctrl.resolveDispute);

router.get('/audit-logs', requirePermission('admin.only'), ctrl.getAuditLogs);

router.get('/settings', requirePermission('admin.only'), ctrl.getSettings);
router.put('/settings', requirePermission('admin.only'), auditRoute({
  action: 'update_settings',
  category: 'settings',
  targetType: 'Settings',
  details: (req) => ({ fields: Object.keys(req.body || {}).slice(0, 20) }),
}), ctrl.updateSettings);
router.post('/settings/banner-image', requirePermission('admin.only'), auditRoute({ action: 'update_banner_image', category: 'settings', targetType: 'Settings' }), upload.single('image'), ctrl.uploadBannerImage);
router.post(
  '/settings/app-release',
  requirePermission('admin.only'),
  auditRoute({ action: 'publish_app_release', category: 'settings', targetType: 'AppRelease' }),
  (req, res, next) => {
    uploadApk.single('apk')(req, res, (error) => {
      if (!error) return next();
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'APK ni kubwa mno. Kiwango cha juu ni 150MB.'
        : (error.message || 'Faili la APK halikubaliki');
      return res.status(400).json({ message });
    });
  },
  ctrl.publishAppRelease,
);

module.exports = router;
