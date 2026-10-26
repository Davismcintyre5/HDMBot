const router = require('express').Router();
const ctrl = require('../controllers/broadcastController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { requireRole } = require('../middleware/admin/roleCheck');
const validate = require('../middleware/admin/validate');
const { sendBroadcastSchema, previewBroadcastSchema } = require('../middleware/admin/schemas');

router.post('/send', requireAuth, requireRole('owner', 'admin'), validate(sendBroadcastSchema, 'body'), asyncHandler(ctrl.sendBatch));
router.post('/preview', requireAuth, requireRole('owner', 'admin', 'moderator'), validate(previewBroadcastSchema, 'body'), asyncHandler(ctrl.preview));
router.get('/history', requireAuth, asyncHandler(ctrl.history));

module.exports = router;