const router = require('express').Router();
const ctrl = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/admin/auth');
const { authLimiter } = require('../middleware/global/rateLimiter');
const validate = require('../middleware/admin/validate');
const { loginSchema, changePasswordSchema } = require('../middleware/admin/schemas');

router.post('/login', authLimiter, validate(loginSchema, 'body'), asyncHandler(ctrl.login));
router.post('/logout', requireAuth, asyncHandler(ctrl.logout));
router.get('/me', requireAuth, asyncHandler(ctrl.me));
router.post('/change-password', requireAuth, validate(changePasswordSchema, 'body'), asyncHandler(ctrl.changePassword));

module.exports = router;