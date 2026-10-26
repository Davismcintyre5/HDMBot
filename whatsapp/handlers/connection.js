const { Boom } = require('@hapi/boom');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const DISCONNECT_LOGGED_OUT = 401;
const DISCONNECT_CONFLICT = 440;

async function handle(sessionId, update, sock, callbacks) {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    await callbacks.setQR(qr);
    return;
  }

  if (connection === 'open') {
    const phoneNumber = (sock.user?.id || '').split(':')[0].split('@')[0] || '';
    await callbacks.onConnected(phoneNumber);
    return;
  }

  if (connection === 'close') {
    const statusCode =
      lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode
        : 0;

    logger.warn({ sessionId, statusCode }, 'connection closed');

    if (statusCode === DISCONNECT_LOGGED_OUT) {
      await callbacks.onLoggedOut();
      return;
    }

    if (statusCode === DISCONNECT_CONFLICT) {
      await callbacks.scheduleReconnect(env.CONFLICT_RETRY_DELAY_MS, 'conflict');
      return;
    }

    const state = callbacks.getRuntime();
    const attempts = (state?.attempts || 0) + 1;
    const delay = Math.min(
      env.RECONNECT_BASE_MS * Math.pow(env.RECONNECT_MULTIPLIER, attempts - 1),
      env.RECONNECT_MAX_MS
    );
    await callbacks.scheduleReconnect(delay, 'transient', attempts);
    return;
  }
}

module.exports = { handle };