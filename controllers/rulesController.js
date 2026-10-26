const { send } = require('../utils/apiResponse');
const { notFound, badRequest } = require('../utils/apiError');
const Rule = require('../models/Rule');
const ruleEngine = require('../core/ruleEngine');
const sessionManager = require('../whatsapp/sessionManager');

const UPDATABLE = ['name', 'enabled', 'priority', 'scope', 'trigger', 'action', 'cooldownMs'];

function pickUpdatable(body) {
  const out = {};
  for (const k of UPDATABLE) {
    if (Object.prototype.hasOwnProperty.call(body, k)) out[k] = body[k];
  }
  return out;
}

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = { sessionId: req.query.sessionId };
  if (req.query.enabled !== undefined) filter.enabled = req.query.enabled === 'true';

  const [items, total] = await Promise.all([
    Rule.find(filter).sort({ priority: 1, createdAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Rule.countDocuments(filter)
  ]);
  return send(res, 200, { items, total, page, limit });
}

async function create(req, res) {
  const doc = await Rule.create({
    ...req.body,
    sessionId: req.body.sessionId,
    createdBy: req.admin.username
  });
  ruleEngine.invalidate(doc.sessionId);
  return send(res, 201, doc);
}

async function get(req, res) {
  const doc = await Rule.findById(req.params.id).lean();
  if (!doc) throw notFound('Rule not found');
  return send(res, 200, doc);
}

async function update(req, res) {
  const patch = pickUpdatable(req.body);
  if (Object.keys(patch).length === 0) throw badRequest('No valid fields to update');
  const doc = await Rule.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true, runValidators: true }).lean();
  if (!doc) throw notFound('Rule not found');
  ruleEngine.invalidate(doc.sessionId);
  return send(res, 200, doc);
}

async function remove(req, res) {
  const doc = await Rule.findByIdAndDelete(req.params.id).lean();
  if (!doc) throw notFound('Rule not found');
  ruleEngine.invalidate(doc.sessionId);
  return send(res, 200, { ok: true });
}

async function test(req, res) {
  const doc = await Rule.findById(req.params.id).lean();
  if (!doc) throw notFound('Rule not found');

  const result = await ruleEngine.dryRun(doc, {
    text: req.body.sampleText || '',
    senderJid: req.body.sampleSenderJid || null
  });

  return send(res, 200, result);
}

async function execute(req, res) {
  const doc = await Rule.findById(req.params.id).lean();
  if (!doc) throw notFound('Rule not found');

  if (!doc.enabled) throw badRequest('Rule is disabled');

  const sessionId = doc.sessionId;
  const sock = sessionManager.getSocket(sessionId);
  if (!sock) throw badRequest('Session not connected — connect it first');

  const chatJid = req.body.chatJid;
  if (!chatJid) throw badRequest('chatJid required');
  if (!/^\d{10,15}@s\.whatsapp\.net$|@g\.us$/.test(chatJid)) {
    throw badRequest('chatJid must end with @s.whatsapp.net or @g.us');
  }

  const sampleText = req.body.sampleText || '';
  const senderJid = req.body.senderJid || null;

  const fakeMsg = {
    key: {
      remoteJid: chatJid,
      fromMe: false,
      id: 'test-' + Date.now(),
      participant: senderJid
    },
    message: {
      conversation: sampleText
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  };

  try {
    await ruleEngine.executeRule(doc, sock, fakeMsg);
    return send(res, 200, {
      ok: true,
      executed: true,
      chatJid,
      action: doc.action?.type
    }, 'Rule executed');
  } catch (err) {
    throw badRequest(`Execution failed: ${err.message}`);
  }
}

module.exports = { list, create, get, update, remove, test, execute };