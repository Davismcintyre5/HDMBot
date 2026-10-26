const router = require('express').Router();
const ctrl = require('../controllers/qrController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { requireRole } = require('../middleware/admin/roleCheck');

router.post('/export', requireAuth, requireRole('owner', 'admin'), asyncHandler(ctrl.exportQR));
router.get('/exported', asyncHandler(ctrl.exported));

module.exports = router;