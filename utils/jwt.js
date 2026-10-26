const jwt = require('jsonwebtoken');
const env = require('../config/env');

function sign(payload, opts = {}) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: opts.expiresIn || env.JWT_EXPIRES_IN,
    ...opts
  });
}

function verify(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function decode(token) {
  return jwt.decode(token);
}

module.exports = { sign, verify, decode };