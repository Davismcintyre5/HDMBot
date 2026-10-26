const env = require('../config/env');
const logger = require('../utils/logger');
const socket = require('../config/socket');
const sessionManager = require('../whatsapp/sessionManager');

const lastSent = new Map();

function shouldSend(eventClass) {
  if (!env.OWNER_ALERTS_ENABLED) return false;
  const now = Date.now();
  const last = lastSent.get(eventClass) || 0;
  return now - last >= env.OWNER_ALERT_RATE_LIMIT_MS;
}

async function send(eventClass, message, meta = {}) {
  if (!shouldSend(eventClass)) return;
  lastSent.set(eventClass, Date.now());

  socket.emitOwnerAlert({ class: eventClass, message, ...meta });

  try {
    const sock = sessionManager.getSocket(env.SESSION_ID);
    if (!sock) return;
    const ownerJid = `${env.OWNER_NUMBER}@s.whatsapp.net`;
    await sock.sendMessage(ownerJid, {
      text: `🚨 *HDM BOT ALERT* [${eventClass}]\n${message}`
    });
  } catch (err) {
    logger.warn({ err, eventClass }, 'owner alert delivery failed');
  }
}

async function flush() {
  lastSent.clear();
}

module.exports = { send, shouldSend, flush };