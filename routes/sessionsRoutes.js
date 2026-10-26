const router = require('express').Router();
const ctrl = require('../controllers/sessionsController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { requireRole } = require('../middleware/admin/roleCheck');
const validate = require('../middleware/admin/validate');
const { createSessionSchema, disconnectSessionSchema } = require('../middleware/admin/schemas');

router.get('/', requireAuth, asyncHandler(ctrl.list));
router.post(
  '/',
  requireAuth,
  requireRole('owner', 'admin'),
  validate(createSessionSchema, 'body'),
  asyncHandler(ctrl.create)
);
router.get('/:id', requireAuth, asyncHandler(ctrl.get));
router.delete('/:id', requireAuth, requireRole('owner'), asyncHandler(ctrl.remove));
router.post('/:id/connect', requireAuth, requireRole('owner', 'admin'), asyncHandler(ctrl.connect));
router.post(
  '/:id/disconnect',
  requireAuth,
  requireRole('owner', 'admin'),
  validate(disconnectSessionSchema, 'body'),
  asyncHandler(ctrl.disconnect)
);
router.post('/:id/sync', requireAuth, requireRole('owner', 'admin'), asyncHandler(ctrl.sync));
router.get('/:id/qr', requireAuth, asyncHandler(ctrl.getQR));
router.post('/:id/export-qr', requireAuth, requireRole('owner', 'admin'), asyncHandler(ctrl.exportQR));

module.exports = router;