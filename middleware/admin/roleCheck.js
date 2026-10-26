const ApiError = require('../../utils/apiError');

const ROLE_RANK = Object.freeze({
  viewer: 1,
  moderator: 2,
  admin: 3,
  owner: 4
});

function requireRole(...roles) {
  const allowed = new Set(roles);
  return function roleCheck(req, res, next) {
    if (!req.admin) return next(ApiError.unauthorized('Authentication required'));
    if (!allowed.has(req.admin.role)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    next();
  };
}

function requireMinRole(role) {
  const minRank = ROLE_RANK[role];
  if (!minRank) throw new Error(`Unknown role: ${role}`);
  return function roleCheck(req, res, next) {
    if (!req.admin) return next(ApiError.unauthorized('Authentication required'));
    const rank = ROLE_RANK[req.admin.role] || 0;
    if (rank < minRank) return next(ApiError.forbidden('Insufficient role'));
    next();
  };
}

function requirePermission(...perms) {
  return function permCheck(req, res, next) {
    if (!req.admin) return next(ApiError.unauthorized('Authentication required'));
    const owned = new Set(req.admin.permissions || []);
    for (const p of perms) {
      if (!owned.has(p)) return next(ApiError.forbidden(`Missing permission: ${p}`));
    }
    next();
  };
}

const requireOwner = requireRole('owner');
const requireAdmin = requireMinRole('admin');
const requireModerator = requireMinRole('moderator');

module.exports = {
  ROLE_RANK,
  requireRole,
  requireMinRole,
  requirePermission,
  requireOwner,
  requireAdmin,
  requireModerator
};