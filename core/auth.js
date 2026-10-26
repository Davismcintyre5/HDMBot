const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { unauthorized, forbidden, badRequest, notFound } = require('../utils/apiError');
const AdminUser = require('../models/AdminUser');

async function login(email, password, ip) {
  const ident = String(email || '').trim().toLowerCase();
  if (!ident) throw unauthorized('Invalid credentials');
  if (!password) throw unauthorized('Invalid credentials');

  const user = await AdminUser.findOne({
    $or: [{ email: ident }, { username: ident }]
  });

  if (!user) throw unauthorized('Invalid credentials');
  if (!user.active) throw forbidden('Account disabled');

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');

  user.lastLogin = new Date();
  user.lastLoginIp = ip || null;
  await user.save();

  const token = jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions || []
    }
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw badRequest('New password must be at least 8 characters');
  }
  if (!currentPassword) throw badRequest('Current password is required');

  const user = await AdminUser.findById(userId);
  if (!user) throw notFound('User not found');

  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) throw unauthorized('Current password incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

module.exports = { login, changePassword, hashPassword };