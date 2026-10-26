const router = require('express').Router();
const ctrl = require('../controllers/healthController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');

router.get('/', asyncHandler(ctrl.health));
router.get('/detailed', requireAuth, asyncHandler(ctrl.detailed));

module.exports = router;