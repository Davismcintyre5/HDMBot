const { send } = require('../utils/apiResponse');
const auth = require('../core/auth');

async function login(req, res) {
  const { email, username, password } = req.body;
  const identifier = (email || username || '').toString().trim();
  const result = await auth.login(identifier, password, req.ip);
  return send(res, 200, result, 'Login successful');
}

async function logout(req, res) {
  return send(res, 200, { ok: true }, 'Logged out');
}

async function me(req, res) {
  return send(res, 200, req.admin);
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  await auth.changePassword(req.admin.id, currentPassword, newPassword);
  return send(res, 200, { ok: true }, 'Password changed');
}

module.exports = { login, logout, me, changePassword };