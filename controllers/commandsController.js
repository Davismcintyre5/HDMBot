const { send } = require('../utils/apiResponse');
const { notFound } = require('../utils/apiError');
const commandRegistry = require('../core/commandRegistry');

async function list(req, res) {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.enabled !== undefined) filter.enabled = req.query.enabled === 'true';
  if (req.query.sessionId) filter.sessionId = req.query.sessionId;

  const commands = await commandRegistry.list(filter);
  const out = commands.map((c) => ({
    name: c.name,
    category: c.category,
    enabled: c.enabled,
    sessionScoped: c.sessionScoped,
    disabledSessions: c.disabledSessions,
    aliases: c.aliases,
    ownerOnly: c.ownerOnly,
    cooldownMs: c.cooldownMs,
    usageCount: c.usageCount,
    lastUsedAt: c.lastUsedAt
  }));
  return send(res, 200, out);
}

async function get(req, res) {
  const cmd = await commandRegistry.get(req.params.name);
  if (!cmd) throw notFound('Command not found');
  return send(res, 200, {
    name: cmd.name,
    category: cmd.category,
    desc: cmd.desc,
    usage: cmd.usage,
    aliases: cmd.aliases,
    enabled: cmd.enabled,
    sessionScoped: cmd.sessionScoped,
    disabledSessions: cmd.disabledSessions,
    ownerOnly: cmd.ownerOnly,
    groupOnly: cmd.groupOnly,
    adminOnly: cmd.adminOnly,
    botAdminNeeded: cmd.botAdminNeeded,
    cooldownMs: cmd.cooldownMs,
    usageCount: cmd.usageCount,
    lastUsedAt: cmd.lastUsedAt,
    usageBySession: cmd.usageBySession
  });
}

async function update(req, res) {
  await commandRegistry.update(req.params.name, req.body);
  const cmd = await commandRegistry.get(req.params.name);
  return send(res, 200, {
    name: cmd.name,
    enabled: cmd.enabled,
    disabledSessions: cmd.disabledSessions,
    aliases: cmd.aliases,
    cooldownMs: cmd.cooldownMs
  });
}

async function usage(req, res) {
  const cmd = await commandRegistry.get(req.params.name);
  if (!cmd) throw notFound('Command not found');
  return send(res, 200, {
    name: cmd.name,
    usageCount: cmd.usageCount,
    lastUsedAt: cmd.lastUsedAt,
    usageBySession: cmd.usageBySession
  });
}

module.exports = { list, get, update, usage };