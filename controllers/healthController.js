const os = require('os');
const mongoose = require('mongoose');
const { send } = require('../utils/apiResponse');
const env = require('../config/env');
const db = require('../config/db');
const cloudinaryConfig = require('../config/cloudinary');
const sessionManager = require('../whatsapp/sessionManager');
const AdminUser = require('../models/AdminUser');
const Session = require('../models/Session');
const Message = require('../models/Message');
const Setting = require('../models/Setting');
const EventLog = require('../models/EventLog');
const Rule = require('../models/Rule');
const Contact = require('../models/Contact');
const Command = require('../models/Command');

const STARTED_AT = Date.now();

function humanUptime(seconds) {
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (parts.length === 0 || sec) parts.push(`${sec}s`);
  return parts.join(' ');
}

async function health(req, res) {
  const dbHealth = await db.health().catch(() => ({ connected: false }));
  const sessions = sessionManager.listSessions();
  const connectedCount = sessions.filter((s) => s.connected).length;
  const healthy = dbHealth.connected;

  return send(res, 200, {
    status: healthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongo: dbHealth.connected ? 'up' : 'down',
    mongoDb: dbHealth.dbName || null,
    redis: env.REDIS_ENABLED ? 'enabled' : 'disabled',
    cloudinary: env.CLOUDINARY_ENABLED ? 'configured' : 'disabled',
    sessionsConnected: connectedCount,
    sessionsTotal: sessions.length,
    sessions
  });
}

async function detailed(req, res) {
  const dbHealth = await db.health().catch(() => ({ connected: false, readyState: 0 }));

  const memUsage = process.memoryUsage();
  const loadAvg = os.loadavg();

  const cpuModel = (os.cpus()[0] && os.cpus()[0].model) || 'unknown';
  const cpuCores = os.cpus().length;

  let redisInfo = { status: env.REDIS_ENABLED ? 'enabled' : 'disabled', host: null, enabled: env.REDIS_ENABLED };
  if (env.REDIS_ENABLED) {
    try {
      const client = require('../config/redis').createClient();
      const info = await client.info('memory').catch(() => null);
      const match = info && info.match(/used_memory_human:([^\r\n]+)/);
      redisInfo.host = env.REDIS_URL.replace(/:\/\/[^@]*@/, '://').replace(/\/\/.*@/, '//');
      if (match) redisInfo.memoryUsed = match[1].trim();
      redisInfo.status = 'connected';
    } catch (err) {
      redisInfo.status = 'error';
      redisInfo.message = err.message;
    }
  }

  const collections = mongoose.connection.readyState === 1
    ? await mongoose.connection.db.listCollections().toArray().catch(() => [])
    : [];

  let totalDocs = 0;
  const perCollection = {};
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments().catch(() => 0);
    perCollection[c.name] = count;
    totalDocs += count;
  }

  const sessions = sessionManager.listSessions();
  const sessionsConnected = sessions.filter((s) => s.connected).length;

  const [adminCount, sessionCount, ruleCount, contactCount, commandCount, settingCount] =
    await Promise.all([
      AdminUser.countDocuments().catch(() => 0),
      Session.countDocuments().catch(() => 0),
      Rule.countDocuments().catch(() => 0),
      Contact.countDocuments().catch(() => 0),
      Command.countDocuments().catch(() => 0),
      Setting.countDocuments().catch(() => 0)
    ]);

  const recentMessages = await Message.countDocuments({
    timestamp: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
  }).catch(() => 0);

  const lastEvent = await EventLog.findOne().sort({ timestamp: -1 }).lean().catch(() => null);

  const payload = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),

    server: {
      status: 'up',
      url: `http://localhost:${env.PORT}`,
      version: '3.0.0',
      node: process.version,
      env: env.NODE_ENV,
      hostname: os.hostname(),
      platform: process.platform,
      platformFull: os.type() + ' ' + os.release(),
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      uptimeHuman: humanUptime(process.uptime()),
      startedAt: new Date(STARTED_AT).toISOString(),
      pid: process.pid,
      cpu: {
        cores: cpuCores,
        model: cpuModel,
        loadAvg
      },
      memory: {
        rssMb: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
        externalMb: Math.round(memUsage.external / 1024 / 1024),
        freeSystemMb: Math.round(os.freemem() / 1024 / 1024),
        totalSystemMb: Math.round(os.totalmem() / 1024 / 1024)
      }
    },

    database: {
      status: dbHealth.connected ? 'up' : 'down',
      type: 'MongoDB',
      database: dbHealth.dbName || mongoose.connection.name || null,
      host: (env.MONGODB_URI.match(/@([^/?]+)/) || [, 'local'])[1],
      collections: collections.length,
      documents: totalDocs,
      perCollection,
      pingMs: dbHealth.pingMs || null
    },

    redis: redisInfo,

    cloudinary: {
      status: env.CLOUDINARY_ENABLED ? 'up' : 'disabled',
      cloud: env.CLOUDINARY_ENABLED ? env.CLOUDINARY_CLOUD_NAME : null,
      folder: env.CLOUDINARY_FOLDER
    },

    whatsapp: {
      status: sessionsConnected > 0 ? 'up' : 'idle',
      connected: sessionsConnected,
      total: sessions.length,
      sessions
    },

    data: {
      admins: adminCount,
      sessions: sessionCount,
      rules: ruleCount,
      contacts: contactCount,
      commands: commandCount,
      settings: settingCount,
      messages24h: recentMessages
    },

    events: lastEvent
      ? { last: lastEvent.class, timestamp: lastEvent.timestamp, message: lastEvent.message }
      : null,

    cors: env.CORS_ORIGINS,

    overall: {
      up: [dbHealth.connected, env.REDIS_ENABLED ? redisInfo.status === 'connected' : true, env.CLOUDINARY_ENABLED].filter(Boolean).length,
      total: 3
    },

    config: {
      botName: env.BOT_NAME,
      ownerName: env.OWNER_NAME,
      ownerNumber: env.OWNER_NUMBER.slice(-4).padStart(env.OWNER_NUMBER.length, '*'),
      defaultPrefix: env.DEFAULT_PREFIX,
      timezone: env.TIMEZONE,
      replicaCount: env.REPLICA_COUNT,
      anticacheTtlHours: env.ANTICACHE_TTL_HOURS,
      messageTtlHours: env.MESSAGE_TTL_HOURS
    }
  };

  return send(res, 200, payload);
}

module.exports = { health, detailed };