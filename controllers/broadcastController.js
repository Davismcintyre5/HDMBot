const { send } = require('../utils/apiResponse');
const { badRequest } = require('../utils/apiError');
const broadcast = require('../core/broadcast');

async function sendBatch(req, res) {
  const { sessionId, targets, contactFilter, text, mediaUrl, caption, delayMs } = req.body;
  if (!sessionId) throw badRequest('sessionId required');

  let jids = [];
  if (Array.isArray(targets) && targets.length > 0) {
    jids = targets;
  } else if (contactFilter) {
    jids = await broadcast.resolveTargets(sessionId, contactFilter);
  }
  if (jids.length === 0) throw badRequest('No valid targets');

  const result = await broadcast.send(sessionId, jids, { text, mediaUrl, caption }, { delayMs });
  return send(res, 202, result, 'Broadcast started');
}

async function preview(req, res) {
  const { sessionId, contactFilter } = req.body;
  if (!sessionId) throw badRequest('sessionId required');
  const result = await broadcast.preview(sessionId, contactFilter || {});
  return send(res, 200, result);
}

async function history(req, res) {
  const sessionId = req.query.sessionId;
  if (!sessionId) throw badRequest('sessionId required');
  const items = await broadcast.history(sessionId, 50);
  return send(res, 200, { items });
}

module.exports = { sendBatch, preview, history };