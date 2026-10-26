const router = require('express').Router();
const ctrl = require('../controllers/rulesController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { requireRole } = require('../middleware/admin/roleCheck');
const validate = require('../middleware/admin/validate');
const {
  createRuleSchema,
  updateRuleSchema,
  testRuleSchema,
  executeRuleSchema
} = require('../middleware/admin/schemas');

router.get('/', requireAuth, asyncHandler(ctrl.list));
router.post('/', requireAuth, requireRole('owner', 'admin'), validate(createRuleSchema, 'body'), asyncHandler(ctrl.create));
router.get('/:id', requireAuth, asyncHandler(ctrl.get));
router.patch('/:id', requireAuth, requireRole('owner', 'admin'), validate(updateRuleSchema, 'body'), asyncHandler(ctrl.update));
router.delete('/:id', requireAuth, requireRole('owner', 'admin'), asyncHandler(ctrl.remove));
router.post('/:id/test', requireAuth, requireRole('owner', 'admin'), validate(testRuleSchema, 'body'), asyncHandler(ctrl.test));
router.post('/:id/execute', requireAuth, requireRole('owner', 'admin'), validate(executeRuleSchema, 'body'), asyncHandler(ctrl.execute));

module.exports = router;