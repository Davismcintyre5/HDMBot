const { send } = require('../utils/apiResponse');
const { notFound } = require('../utils/apiError');
const sessionManager = require('../whatsapp/sessionManager');
const state = require('../whatsapp/state');
const Session = require('../models/Session');

const norm = (req) =>
  String(req.params.id || req.body.sessionId || '')
    .trim()
    .toLowerCase();

async function list(req, res) {
  const live = sessionManager.listSessions();
  const liveMap = new Map(live.map((s) => [s.sessionId, s]));
  const stored = await Session.find({}, { creds: 0, keys: 0 }).lean();

  const out = stored.map((s) => {
    const runtime = liveMap.get(s.sessionId);
    return {
      sessionId: s.sessionId,
      status: runtime ? runtime.status : s.status,
      phoneNumber:
        (runtime && runtime.phoneNumber) || (s.meta && s.meta.phoneNumber) || '',
      lastConnected: (s.meta && s.meta.lastConnected) || null,
      lastDisconnected: (s.meta && s.meta.lastDisconnected) || null,
      backupAgeSec: s.updatedAt
        ? Math.floor((Date.now() - new Date(s.updatedAt).getTime()) / 1000)
        : null
    };
  });

  return send(res, 200, out);
}

async function get(req, res) {
  const id = norm(req);
  const doc = await Session.findOne(
    { sessionId: id },
    { creds: 0, keys: 0 }
  ).lean();
  if (!doc) throw notFound('Session not found');
  const status = sessionManager.getStatus(id);
  return send(res, 200, {
    sessionId: doc.sessionId,
    status,
    phoneNumber: (doc.meta && doc.meta.phoneNumber) || '',
    lastConnected: (doc.meta && doc.meta.lastConnected) || null,
    lastDisconnected: (doc.meta && doc.meta.lastDisconnected) || null
  });
}

async function create(req, res) {
  const id = norm(req);
  const existing = await Session.findOne({ sessionId: id }).lean();
  if (existing) {
    const status = sessionManager.getStatus(id);
    if (status === 'open') {
      return send(res, 200, { sessionId: id, connected: true, status }, 'Already connected');
    }
    const result = await sessionManager.connect(id);
    return send(res, 200, { sessionId: id, status, ...result });
  }
  const result = await sessionManager.connect(id);
  return send(res, 201, { sessionId: id, ...result }, 'Session connecting');
}

async function connect(req, res) {
  const id = norm(req);
  const result = await sessionManager.connect(id);
  return send(res, 200, { sessionId: id, ...result });
}

async function disconnect(req, res) {
  const id = norm(req);
  const logout = req.body?.logout === true;
  await sessionManager.disconnect(id, { logout });
  return send(res, 200, { ok: true });
}

async function remove(req, res) {
  const id = norm(req);
  await sessionManager.deleteSession(id);
  return send(res, 200, { ok: true });
}

async function sync(req, res) {
  const id = norm(req);
  await sessionManager.syncToMongo(id);
  return send(res, 200, {
    ok: true,
    backedUpAt: new Date().toISOString()
  });
}

async function getQR(req, res) {
  const id = norm(req);
  const qr = sessionManager.getQR(id);
  const scanned = sessionManager.isQRScanned(id);
  const connected = sessionManager.isConnected(id);
  if (connected) {
    return send(res, 200, { connected: true, qr: null, qrScanned: true });
  }
  return send(res, 200, { connected: false, qr, qrScanned: scanned });
}

async function exportQR(req, res) {
  const id = norm(req);
  const qr = sessionManager.getQR(id);
  if (!qr) throw notFound('No QR available — connect the session first');
  state.setQRExport(id, qr);
  return send(res, 200, { ok: true, url: '/api/qr/exported' });
}

module.exports = {
  list,
  get,
  create,
  connect,
  disconnect,
  remove,
  sync,
  getQR,
  exportQR
};