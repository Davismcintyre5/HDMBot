const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { requireRole } = require('../middleware/admin/roleCheck');
const validate = require('../middleware/admin/validate');
const { setSettingSchema } = require('../middleware/admin/schemas');

router.get('/', requireAuth, asyncHandler(ctrl.list));
router.get('/defaults', requireAuth, asyncHandler(ctrl.defaults));
router.get('/:key', requireAuth, asyncHandler(ctrl.get));
router.put('/:key', requireAuth, requireRole('owner', 'admin'), validate(setSettingSchema, 'body'), asyncHandler(ctrl.set));
router.delete('/:key', requireAuth, requireRole('owner', 'admin'), asyncHandler(ctrl.reset));

module.exports = router;