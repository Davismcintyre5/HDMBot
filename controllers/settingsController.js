const { send } = require('../utils/apiResponse');
const { notFound } = require('../utils/apiError');
const settings = require('../core/settings');

async function list(req, res) {
  const sessionId = req.query.sessionId;
  if (!sessionId) throw notFound('sessionId required');
  const all = await settings.getAll(sessionId);
  return send(res, 200, all);
}

async function get(req, res) {
  const sessionId = req.query.sessionId;
  if (!sessionId) throw notFound('sessionId required');
  const value = await settings.getOrDefault(sessionId, req.params.key);
  return send(res, 200, { key: req.params.key, value });
}

async function set(req, res) {
  const sessionId = req.query.sessionId;
  if (!sessionId) throw notFound('sessionId required');
  await settings.set(sessionId, req.params.key, req.body.value, req.admin.username);
  return send(res, 200, { key: req.params.key, value: req.body.value });
}

async function reset(req, res) {
  const sessionId = req.query.sessionId;
  if (!sessionId) throw notFound('sessionId required');
  await settings.reset(sessionId, req.params.key);
  return send(res, 200, { ok: true });
}

async function defaults(req, res) {
  const out = {};
  for (const [k, v] of Object.entries(settings.DEFAULTS)) out[k] = v;
  return send(res, 200, out);
}

module.exports = { list, get, set, reset, defaults };