const { send } = require('../utils/apiResponse');
const { notFound } = require('../utils/apiError');
const state = require('../whatsapp/state');
const sessionManager = require('../whatsapp/sessionManager');

async function exported(req, res) {
  const entry = state.getQRExport();
  if (!entry) {
    return send(res, 200, { qr: null, sessionId: null, expiresAt: null });
  }
  return send(res, 200, entry);
}

async function exportQR(req, res) {
  const { sessionId } = req.body;
  if (!sessionId) throw notFound('sessionId required');
  const qr = sessionManager.getQR(sessionId);
  if (!qr) throw notFound('No QR available — connect the session first');
  state.setQRExport(sessionId, qr);
  return send(res, 200, { ok: true, url: '/api/qr/exported' });
}

module.exports = { exported, exportQR };