const router = require('express').Router();
const ctrl = require('../controllers/commandsController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { requireRole } = require('../middleware/admin/roleCheck');
const validate = require('../middleware/admin/validate');
const { updateCommandSchema } = require('../middleware/admin/schemas');

router.get('/', requireAuth, asyncHandler(ctrl.list));
router.get('/:name', requireAuth, asyncHandler(ctrl.get));
router.patch('/:name', requireAuth, requireRole('owner', 'admin'), validate(updateCommandSchema, 'body'), asyncHandler(ctrl.update));
router.get('/:name/usage', requireAuth, asyncHandler(ctrl.usage));

module.exports = router;