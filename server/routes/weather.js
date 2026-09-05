const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/roleCheck');
const ctrl = require('../controllers/weather.controller');

router.get('/forecast', ctrl.getForecast);
router.get('/config', ctrl.getConfig);
router.get('/config/admin', requirePermission('weather.manage'), ctrl.getConfigAdmin);
router.put('/config', requirePermission('weather.manage'), ctrl.updateConfig);

router.get('/zones', ctrl.getZones);
router.post('/zones', requirePermission('weather.manage'), ctrl.createZone);
router.put('/zones/:id', requirePermission('weather.manage'), ctrl.updateZone);
router.delete('/zones/:id', requirePermission('weather.manage'), ctrl.deleteZone);

module.exports = router;