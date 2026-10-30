const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const pino = require('pino');
const { useMongoAuthState } = require('@ecync/wsm');
const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');

const env = require('../config/env');
const logger = require('../utils/logger');
const socket = require('../config/socket');
const state = require('./state');
const connectionHandler = require('./handlers/connection');
const messageHandler = require('./handlers/message');
const Session = require('../models/Session');

const sessions = new Map();
const connecting = new Map();
const silentLogger = pino({ level: 'silent' });

function normalizeSessionId(sessionId) {
  return String(sessionId || '').trim().toLowerCase();
}

function sessionDir(sessionId) {
  return path.join(env.AUTH_TMP_DIR, sessionId);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function ensureSessionDoc(sessionId) {
  try {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: {
          sessionId,
          status: 'inactive',
          'meta.platform': 'WhatsApp',
          'meta.botName': sessionId
        }
      },
      { upsert: true }
    );
  } catch (err) {
    logger.warn({ err, sessionId }, 'ensureSessionDoc failed');
  }
}

function setQR(sessionId, qrString) {
  const runtime = sessions.get(sessionId);
  if (!runtime) return;

  runtime.rawQR = qrString;
  runtime.qrScanned = false;
  runtime.status = 'qr_pending';

  qrcode
    .toDataURL(qrString)
    .then((dataUrl) => {
      runtime.qr = dataUrl;
      socket.emitQRUpdate(sessionId, {
        qr: dataUrl,
        qrScanned: false,
        connected: false
      });
      socket.emitSessionStatus({ sessions: listSessions() });
    })
    .catch((err) => {
      logger.warn({ err, sessionId }, 'qrcode.toDataURL failed');
    });
}

async function onConnected(sessionId, phoneNumber) {
  const runtime = sessions.get(sessionId);
  if (!runtime) return;
  runtime.qr = null;
  runtime.rawQR = null;
  runtime.qrScanned = true;
  runtime.status = 'open';
  runtime.phoneNumber = phoneNumber;
  runtime.attempts = 0;
  runtime.connectedAt = new Date();

  try {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          status: 'active',
          'meta.lastConnected': new Date(),
          'meta.phoneNumber': phoneNumber || '',
          'meta.nextAttemptAt': null
        }
      },
      { upsert: true }
    );
  } catch (err) {
    logger.warn({ err, sessionId }, 'Session meta update failed');
  }

  socket.emitQRUpdate(sessionId, {
    qr: null,
    qrScanned: true,
    connected: true
  });
  socket.emitSessionStatus({ sessions: listSessions() });
  logger.info({ sessionId, phoneNumber }, 'session connected');
}

async function onLoggedOut(sessionId) {
  const runtime = sessions.get(sessionId);
  if (runtime && runtime.sock) {
    try {
      runtime.sock.end(new Error('logged out'));
    } catch {}
  }
  sessions.delete(sessionId);
  state.clearSession(sessionId);

  try {
    await Session.findOneAndUpdate(
      { sessionId },
      { $set: { status: 'logged_out', 'meta.lastDisconnected': new Date() } }
    );
  } catch {}

  socket.emitQRUpdate(sessionId, { qr: null, qrScanned: false, connected: false });
  socket.emitSessionStatus({ sessions: listSessions() });
  logger.warn({ sessionId }, 'session logged out');
}

async function scheduleReconnect(sessionId, delayMs, reason, attempts) {
  const runtime = sessions.get(sessionId);
  if (!runtime) return;
  runtime.status = 'reconnecting';
  runtime.attempts = attempts || (runtime.attempts || 0);
  runtime.nextAttemptAt = new Date(Date.now() + delayMs);

  try {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          'meta.lastDisconnected': new Date(),
          'meta.lastDisconnectReason': reason || null,
          'meta.nextAttemptAt': runtime.nextAttemptAt
        }
      }
    );
  } catch {}

  socket.emitSessionStatus({ sessions: listSessions() });
  logger.debug({ sessionId, delayMs, reason }, 'scheduled reconnect');

  const timer = setTimeout(() => {
    if (!sessions.has(sessionId)) return;
    connect(sessionId).catch((err) =>
      logger.warn({ err, sessionId }, 'reconnect failed')
    );
  }, delayMs);
  if (timer.unref) timer.unref();
}

async function connect(sessionIdRaw) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  if (!sessionId) throw new Error('sessionId required');

  if (connecting.has(sessionId)) return connecting.get(sessionId);

  const existing = sessions.get(sessionId);
  if (existing && existing.status === 'open') {
    return { connected: true, status: 'open' };
  }

  const previous = sessions.get(sessionId);
  const lastQR = previous?.qr || null;

  const runtime = {
    sock: null,
    status: 'connecting',
    qr: lastQR,
    rawQR: null,
    qrScanned: previous?.qrScanned || false,
    phoneNumber: previous?.phoneNumber || '',
    attempts: previous?.attempts || 0,
    connectedAt: previous?.connectedAt || null,
    nextAttemptAt: null
  };
  sessions.set(sessionId, runtime);
  socket.emitSessionStatus({ sessions: listSessions() });

  const task = (async () => {
    await ensureSessionDoc(sessionId);

    const dir = sessionDir(sessionId);
    ensureDir(dir);

    const { state: authState, saveCreds } = await useMongoAuthState(
      env.MONGODB_URI,
      {
        session: sessionId,
        collectionName: 'whatsapp_sessions',
        maxRetries: 10,
        retryRequestDelayMs: 500
      }
    );

    const { version } = await fetchLatestBaileysVersion();

    logger.info({ sessionId, baileys: version.join('.') }, 'connecting session');

    const sock = makeWASocket({
      version,
      logger: silentLogger,
      printQRInTerminal: false,
      auth: {
        creds: authState.creds,
        keys: makeCacheableSignalKeyStore(authState.keys, silentLogger)
      },
      browser: Browsers.ubuntu('Chrome'),
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000
    });

    runtime.sock = sock;

    try {
      await Session.findOneAndUpdate(
        { sessionId },
        { $set: { status: 'inactive', 'meta.lastDisconnected': null } }
      );
    } catch {}

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) =>
      connectionHandler
        .handle(sessionId, update, sock, {
          setQR: (qr) => setQR(sessionId, qr),
          onConnected: (phone) => onConnected(sessionId, phone),
          onLoggedOut: () => onLoggedOut(sessionId),
          scheduleReconnect: (delayMs, reason, attempts) =>
            scheduleReconnect(sessionId, delayMs, reason, attempts),
          getRuntime: () => sessions.get(sessionId)
        })
        .catch((err) =>
          logger.error({ err, sessionId }, 'connection handler error')
        )
    );

    sock.ev.on('messages.upsert', ({ messages }) =>
      messageHandler
        .handle(sessionId, sock, messages)
        .catch((err) =>
          logger.error({ err, sessionId }, 'messages.upsert handler error')
        )
    );

    sock.ev.on('messages.update', (updates) =>
      messageHandler
        .handleUpdate(sessionId, sock, updates)
        .catch((err) =>
          logger.error({ err, sessionId }, 'messages.update handler error')
        )
    );

    sock.ev.on('group-participants.update', (update) =>
      messageHandler
        .handleGroupUpdate(sessionId, sock, update)
        .catch((err) =>
          logger.error({ err, sessionId }, 'group-participants.update handler error')
        )
    );

    return { connected: false, qr: lastQR, needQr: true };
  })();

  connecting.set(sessionId, task);
  try {
    return await task;
  } finally {
    connecting.delete(sessionId);
  }
}

async function disconnect(sessionIdRaw, { logout = false } = {}) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  const runtime = sessions.get(sessionId);
  if (!runtime) return;
  if (runtime.sock) {
    try {
      if (logout) await runtime.sock.logout();
      else runtime.sock.end(new Error('disconnect'));
    } catch {}
  }
  sessions.delete(sessionId);
  state.clearSession(sessionId);
  socket.emitSessionStatus({ sessions: listSessions() });
}

async function deleteSession(sessionIdRaw) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  await disconnect(sessionId, { logout: true });
  await Session.deleteOne({ sessionId });
  const dir = sessionDir(sessionId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  socket.emitSessionStatus({ sessions: listSessions() });
}

async function shutdownAll() {
  for (const [sessionId, runtime] of sessions) {
    try {
      if (runtime.sock) runtime.sock.end(new Error('shutdown'));
    } catch {}
  }
  sessions.clear();
  connecting.clear();
}

async function boot() {
  if (!env.AUTO_CONNECT_DEFAULT) return;

  const docs = await Session.find({ status: 'active' }).lean();
  if (docs.length === 0) {
    logger.info('no active sessions to boot');
    return;
  }

  for (const doc of docs) {
    const nextAt =
      doc.meta && doc.meta.nextAttemptAt
        ? new Date(doc.meta.nextAttemptAt)
        : null;
    if (nextAt && nextAt.getTime() > Date.now()) {
      logger.info(
        { sessionId: doc.sessionId, nextAttemptAt: nextAt },
        'session in backoff window'
      );
      continue;
    }
    try {
      await connect(doc.sessionId);
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      logger.warn({ err, sessionId: doc.sessionId }, 'boot connect failed');
    }
  }
}

function getSocket(sessionIdRaw) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  const runtime = sessions.get(sessionId);
  return runtime && runtime.status === 'open' ? runtime.sock : null;
}

function getStatus(sessionIdRaw) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  const runtime = sessions.get(sessionId);
  return runtime ? runtime.status : 'inactive';
}

function isConnected(sessionIdRaw) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  const runtime = sessions.get(sessionId);
  return !!(runtime && runtime.status === 'open' && runtime.sock && runtime.sock.ws);
}

function getQR(sessionIdRaw) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  const runtime = sessions.get(sessionId);
  return runtime ? runtime.qr : null;
}

function isQRScanned(sessionIdRaw) {
  const sessionId = normalizeSessionId(sessionIdRaw);
  const runtime = sessions.get(sessionId);
  return runtime ? !!runtime.qrScanned : false;
}

function listSessions() {
  const out = [];
  for (const [sessionId, runtime] of sessions) {
    out.push({
      sessionId,
      status: runtime.status,
      phoneNumber: runtime.phoneNumber || '',
      qrAvailable: !!runtime.qr,
      qrScanned: !!runtime.qrScanned,
      connected: runtime.status === 'open',
      connectedAt: runtime.connectedAt,
      attempts: runtime.attempts || 0,
      nextAttemptAt: runtime.nextAttemptAt
    });
  }
  return out;
}

async function syncToMongo(sessionIdRaw) {
  // No-op: auth state is already persisted by useMongoAuthState.
  // Kept for API compatibility.
}

module.exports = {
  connect,
  disconnect,
  deleteSession,
  shutdownAll,
  boot,
  getSocket,
  getStatus,
  isConnected,
  getQR,
  isQRScanned,
  listSessions,
  syncToMongo,
  normalizeSessionId
};