const { send } = require('../utils/apiResponse');
const { notFound, badRequest, conflict } = require('../utils/apiError');
const jid = require('../utils/jid');
const Contact = require('../models/Contact');
const sessionManager = require('../whatsapp/sessionManager');

const UPDATABLE = ['displayName', 'tags', 'notes', 'blacklisted', 'whitelisted', 'muted'];

function pickUpdatable(body) {
  const out = {};
  for (const k of UPDATABLE) {
    if (Object.prototype.hasOwnProperty.call(body, k)) out[k] = body[k];
  }
  return out;
}

function kindOf(j) {
  if (jid.isGroupJid(j)) return 'group';
  if (jid.isStatusJid(j)) return 'status';
  return 'user';
}

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const filter = { sessionId: req.query.sessionId };
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.blacklisted !== undefined) filter.blacklisted = req.query.blacklisted === 'true';

  const [items, total] = await Promise.all([
    Contact.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Contact.countDocuments(filter)
  ]);
  return send(res, 200, { items, total, page, limit });
}

async function get(req, res) {
  const doc = await Contact.findOne({ sessionId: req.query.sessionId, jid: req.params.jid }).lean();
  if (!doc) throw notFound('Contact not found');
  return send(res, 200, doc);
}

async function create(req, res) {
  const { sessionId, jid: contactJid, displayName, tags, notes, blacklisted, muted } = req.body;
  if (!sessionId || !contactJid) throw badRequest('sessionId and jid are required');

  try {
    const doc = await Contact.create({
      sessionId,
      jid: contactJid,
      kind: kindOf(contactJid),
      number: jid.fromJid(contactJid),
      displayName: displayName || null,
      tags: tags || [],
      notes: notes || null,
      blacklisted: !!blacklisted,
      muted: !!muted
    });
    return send(res, 201, doc);
  } catch (err) {
    if (err.code === 11000) throw conflict('Contact already exists');
    throw err;
  }
}

async function update(req, res) {
  const patch = pickUpdatable(req.body);
  if (Object.keys(patch).length === 0) throw badRequest('No valid fields to update');
  const doc = await Contact.findOneAndUpdate(
    { sessionId: req.query.sessionId, jid: req.params.jid },
    { $set: patch },
    { new: true }
  ).lean();
  if (!doc) throw notFound('Contact not found');
  return send(res, 200, doc);
}

async function remove(req, res) {
  const doc = await Contact.findOneAndDelete({ sessionId: req.query.sessionId, jid: req.params.jid }).lean();
  if (!doc) throw notFound('Contact not found');
  return send(res, 200, { ok: true });
}

async function sync(req, res) {
  const { sessionId, jid: contactJid } = req.body;
  if (!sessionId || !contactJid) throw badRequest('sessionId and jid are required');

  const sock = sessionManager.getSocket(sessionId);
  if (!sock) throw badRequest('Session not connected');

  let meta = null;
  try {
    if (jid.isGroupJid(contactJid)) {
      meta = await sock.groupMetadata(contactJid);
    } else {
      const results = await sock.onWhatsApp(contactJid);
      meta = results && results[0] ? results[0] : null;
    }
  } catch {
    meta = null;
  }

  const doc = await Contact.findOneAndUpdate(
    { sessionId, jid: contactJid },
    {
      $set: {
        kind: kindOf(contactJid),
        number: jid.fromJid(contactJid),
        waName: (meta && (meta.subject || meta.verify)) || null,
        metadata: meta || null,
        lastInteractedAt: new Date()
      }
    },
    { new: true, upsert: true }
  ).lean();

  return send(res, 200, doc);
}

module.exports = { list, get, create, update, remove, sync };