const crypto = require('crypto');
const logger = require('../utils/logger');
const jid = require('../utils/jid');
const ApiError = require('../utils/apiError');
const Contact = require('../models/Contact');
const EventLog = require('../models/EventLog');
const socket = require('../config/socket');
const settings = require('./settings');
const sessionManager = require('../whatsapp/sessionManager');

async function resolveTargets(sessionId, filter = {}) {
  const query = { sessionId };
  if (filter.kind) query.kind = filter.kind;
  if (filter.tag) query.tags = filter.tag;
  if (filter.blacklisted !== undefined) query.blacklisted = filter.blacklisted;
  if (filter.whitelisted !== undefined) query.whitelisted = filter.whitelisted;

  const contacts = await Contact.find(query).lean();
  const jids = [];
  const seen = new Set();
  for (const c of contacts) {
    if (c.kind !== 'user' && c.kind !== 'group') continue;
    if (seen.has(c.jid)) continue;
    seen.add(c.jid);
    jids.push(c.jid);
  }
  return jids;
}

async function runBatch(jobId, sessionId, jids, payload, delayMs) {
  const sock = sessionManager.getSocket(sessionId);
  let sent = 0;
  let failed = 0;
  const total = jids.length;

  for (let i = 0; i < jids.length; i++) {
    const target = jids[i];
    try {
      if (payload.text) {
        await sock.sendMessage(target, { text: payload.text });
      } else if (payload.mediaUrl) {
        await sock.sendMessage(target, { image: { url: payload.mediaUrl }, caption: payload.caption || '' });
      }
      sent += 1;
    } catch (err) {
      failed += 1;
      logger.debug({ err, target, sessionId }, 'broadcast send failed');
    }

    if ((i + 1) % 5 === 0 || i === jids.length - 1) {
      socket.emitBroadcastProgress(jobId, { sent, failed, total, done: i === jids.length - 1 });
    }

    if (i < jids.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  await EventLog.create({
    sessionId,
    class: 'broadcast',
    severity: failed === 0 ? 'info' : 'warn',
    message: `broadcast ${jobId} completed`,
    meta: { jobId, targetCount: total, sent, failed }
  }).catch(() => {});

  logger.info({ jobId, sessionId, sent, failed, total }, 'broadcast complete');
}

async function send(sessionId, jids, payload, options = {}) {
  if (!Array.isArray(jids) || jids.length === 0) throw ApiError.badRequest('No targets');
  if (!sessionManager.isConnected(sessionId)) throw ApiError.badRequest('Session not connected');

  const delayMsRaw = options.delayMs != null
    ? options.delayMs
    : await settings.getOrDefault(sessionId, 'broadcast_delay_ms');
  const delayMs = Math.max(1000, Number(delayMsRaw) || 3000);

  const jobId = crypto.randomUUID();
  setImmediate(() => {
    runBatch(jobId, sessionId, jids, payload, delayMs).catch((err) => {
      logger.error({ err, jobId }, 'broadcast batch crashed');
    });
  });

  return { jobId, targetCount: jids.length };
}

async function history(sessionId, limit = 50) {
  return EventLog.find({ class: 'broadcast', sessionId }).sort({ timestamp: -1 }).limit(limit).lean();
}

async function preview(sessionId, filter) {
  const jids = await resolveTargets(sessionId, filter);
  return { count: jids.length, sample: jids.slice(0, 10) };
}

module.exports = { send, resolveTargets, history, preview };