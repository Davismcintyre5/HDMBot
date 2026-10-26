const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');

router.get('/stats', requireAuth, asyncHandler(ctrl.stats));
router.get('/recent-messages', requireAuth, asyncHandler(ctrl.recentMessages));
router.get('/sessions-summary', requireAuth, asyncHandler(ctrl.sessionsSummary));
router.get('/activity', requireAuth, asyncHandler(ctrl.activity));

module.exports = router;