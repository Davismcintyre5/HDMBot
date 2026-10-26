const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./env');
const logger = require('../utils/logger');

let io = null;

const EVENTS = Object.freeze({
  QR_UPDATE: 'qr_update',
  SESSION_STATUS: 'session_status',
  SESSIONS: 'sessions',
  MESSAGE_NEW: 'message:new',
  BROADCAST_PROGRESS: 'broadcast:progress',
  OWNER_ALERT: 'owner_alert',
  CONNECTED: 'connected',
  AUTH_ERROR: 'auth_error'
});

function normalizeSessionId(sessionId) {
  return String(sessionId || '').trim().toLowerCase();
}

function sessionRoom(sessionId) {
  return `session:${normalizeSessionId(sessionId)}`;
}

function createSocketServer(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    const rawSessionId = socket.handshake.query?.sessionId;
    if (rawSessionId) {
      socket.join(sessionRoom(rawSessionId));
      logger.debug(
        { id: socket.id, room: sessionRoom(rawSessionId) },
        'socket joined session room'
      );
    }

    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        socket.data.admin = decoded;
        socket.join('dashboard');
        socket.emit(EVENTS.CONNECTED, { ok: true, rooms: ['dashboard'] });
        logger.debug({ id: socket.id }, 'socket joined dashboard');
      } catch {
        socket.emit(EVENTS.AUTH_ERROR, { error: 'invalid token' });
      }
    } else {
      socket.emit(EVENTS.CONNECTED, {
        ok: true,
        rooms: rawSessionId ? [sessionRoom(rawSessionId)] : []
      });
    }

    socket.on('disconnect', () => {
      logger.debug({ id: socket.id }, 'socket disconnected');
    });
  });

  logger.info('Socket.IO attached');
  return io;
}

function getIO() {
  return io;
}

function closeSocketServer() {
  if (io) {
    io.close();
    io = null;
  }
}

function emitQRUpdate(sessionId, payload) {
  if (!io) return;
  const data = {
    sessionId: normalizeSessionId(sessionId),
    ...payload
  };
  io.to(sessionRoom(sessionId)).emit(EVENTS.QR_UPDATE, data);
  io.to('dashboard').emit(EVENTS.QR_UPDATE, data);
}

function emitSessionStatus(payload) {
  if (io) io.emit(EVENTS.SESSION_STATUS, payload);
}

function emitSessionList(sessions) {
  if (io) io.emit(EVENTS.SESSIONS, { sessions });
}

function emitNewMessage(summary) {
  if (io) {
    io.to('dashboard').emit(EVENTS.MESSAGE_NEW, summary);
    if (summary.sessionId) {
      io.to(sessionRoom(summary.sessionId)).emit(EVENTS.MESSAGE_NEW, summary);
    }
  }
}

function emitBroadcastProgress(jobId, progress) {
  if (io) io.to('dashboard').emit(EVENTS.BROADCAST_PROGRESS, { jobId, ...progress });
}

function emitOwnerAlert(alert) {
  if (io) io.to('dashboard').emit(EVENTS.OWNER_ALERT, alert);
}

module.exports = {
  createSocketServer,
  getIO,
  closeSocketServer,
  emitQRUpdate,
  emitSessionStatus,
  emitSessionList,
  emitNewMessage,
  emitBroadcastProgress,
  emitOwnerAlert,
  sessionRoom,
  EVENTS
};