const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { unauthorized, forbidden } = require('../../utils/apiError');
const AdminUser = require('../../models/AdminUser');

async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) throw unauthorized('Missing token');

    let decoded;
    try {
      decoded = jwt.verify(match[1], env.JWT_SECRET);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const user = await AdminUser.findById(decoded.sub).lean();
    if (!user) throw unauthorized('Account not found');
    if (!user.active) throw forbidden('Account disabled');

    req.admin = {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      active: user.active
    };
    req.auth = { issuedAt: decoded.iat, expiresAt: decoded.exp };
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'auth failed');
    next(err);
  }
}

module.exports = { requireAuth };