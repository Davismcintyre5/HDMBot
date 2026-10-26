const router = require('express').Router();
const ctrl = require('../controllers/contactsController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { requireRole } = require('../middleware/admin/roleCheck');
const validate = require('../middleware/admin/validate');
const { createContactSchema, updateContactSchema, syncContactSchema } = require('../middleware/admin/schemas');

router.get('/', requireAuth, asyncHandler(ctrl.list));
router.post('/', requireAuth, requireRole('owner', 'admin', 'moderator'), validate(createContactSchema, 'body'), asyncHandler(ctrl.create));
router.post('/sync', requireAuth, requireRole('owner', 'admin', 'moderator'), validate(syncContactSchema, 'body'), asyncHandler(ctrl.sync));
router.get('/:jid', requireAuth, asyncHandler(ctrl.get));
router.patch('/:jid', requireAuth, requireRole('owner', 'admin', 'moderator'), validate(updateContactSchema, 'body'), asyncHandler(ctrl.update));
router.delete('/:jid', requireAuth, requireRole('owner', 'admin'), asyncHandler(ctrl.remove));

module.exports = router;