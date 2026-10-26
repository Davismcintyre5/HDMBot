const { send } = require('../utils/apiResponse');
const Session = require('../models/Session');
const Message = require('../models/Message');
const Rule = require('../models/Rule');
const Contact = require('../models/Contact');
const Command = require('../models/Command');
const sessionManager = require('../whatsapp/sessionManager');

const statsCache = { key: null, value: null, expiresAt: 0 };

async function stats(req, res) {
  const sessionId = req.query.sessionId || null;
  const cacheKey = sessionId || '__global__';

  if (
    statsCache.value &&
    statsCache.key === cacheKey &&
    Date.now() < statsCache.expiresAt
  ) {
    return send(res, 200, statsCache.value);
  }

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const filter = sessionId ? { sessionId } : {};

  const [activeSessions, messages24h, rules, contacts, usageAgg] = await Promise.all([
    Session.countDocuments({ ...filter, status: 'active' }),
    Message.countDocuments({ ...filter, timestamp: { $gte: since24h } }),
    Rule.countDocuments(filter),
    Contact.countDocuments(filter),
    Command.aggregate([
      { $group: { _id: null, total: { $sum: '$usageCount' } } }
    ])
  ]);

  const value = {
    activeSessions,
    messages24h,
    rules,
    contacts,
    totalCommandUsage: usageAgg[0]?.total || 0
  };

  statsCache.key = cacheKey;
  statsCache.value = value;
  statsCache.expiresAt = Date.now() + 60000;

  return send(res, 200, value);
}

async function recentMessages(req, res) {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const hours = Math.min(24, Math.max(1, parseInt(req.query.hours, 10) || 1));
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const filter = { timestamp: { $gte: since } };
  if (req.query.sessionId) filter.sessionId = req.query.sessionId;

  const items = await Message.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('sessionId msgId chatJid senderJid type text timestamp media.cloudinaryUrl')
    .lean();

  return send(res, 200, { items, hours, limit });
}

async function sessionsSummary(req, res) {
  const runtime = sessionManager.listSessions();
  const runtimeMap = new Map(runtime.map((s) => [s.sessionId, s]));

  const stored = await Session.find(
    {},
    { sessionId: 1, status: 1, meta: 1, updatedAt: 1 }
  ).lean();

  const out = stored.map((s) => {
    const rt = runtimeMap.get(s.sessionId);
    return {
      sessionId: s.sessionId,
      status: rt ? rt.status : s.status,
      connected: rt ? rt.connected : false,
      phoneNumber: (rt && rt.phoneNumber) || (s.meta && s.meta.phoneNumber) || '',
      qrAvailable: rt ? rt.qrAvailable : false,
      qrScanned: rt ? rt.qrScanned : false,
      connectedAt: rt ? rt.connectedAt : null,
      attempts: rt ? rt.attempts : 0,
      nextAttemptAt: rt ? rt.nextAttemptAt : null,
      backupAgeSec: s.updatedAt
        ? Math.floor((Date.now() - new Date(s.updatedAt).getTime()) / 1000)
        : null
    };
  });

  return send(res, 200, out);
}

async function activity(req, res) {
  const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 7));
  const since = new Date(Date.now() - days * 86400 * 1000);
  since.setHours(0, 0, 0, 0);

  const filter = { timestamp: { $gte: since } };
  if (req.query.sessionId) filter.sessionId = req.query.sessionId;

  const rows = await Message.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const byDate = new Map(rows.map((r) => [r._id, r.count]));
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400 * 1000);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: byDate.get(key) || 0 });
  }

  return send(res, 200, { days, series });
}

module.exports = { stats, recentMessages, sessionsSummary, activity };