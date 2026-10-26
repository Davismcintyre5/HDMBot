const rateLimit = require('express-rate-limit');
const env = require('../../config/env');
const { tooManyRequests } = require('../../utils/apiError');

function buildStore() {
  if (!env.REDIS_ENABLED) return undefined;
  try {
    const RedisStore = require('rate-limit-redis');
    const client = require('../../config/redis').createClient();
    return new RedisStore({ sendCommand: (...args) => client.call(...args) });
  } catch {
    return undefined;
  }
}

function handler(req, res, next) {
  next(tooManyRequests('Rate limit exceeded'));
}

function make({ windowMs, max, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler,
    store: buildStore()
  });
}

const globalLimiter = make({
  windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  max: env.RATE_LIMIT_GLOBAL_MAX
});

const authLimiter = make({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  skipSuccessfulRequests: true
});

const writeLimiter = make({
  windowMs: env.RATE_LIMIT_WRITE_WINDOW_MS,
  max: env.RATE_LIMIT_WRITE_MAX
});

const broadcastLimiter = make({
  windowMs: env.RATE_LIMIT_BROADCAST_WINDOW_MS,
  max: env.RATE_LIMIT_BROADCAST_MAX
});

const sessionLifecycleLimiter = make({
  windowMs: env.RATE_LIMIT_SESSION_WINDOW_MS,
  max: env.RATE_LIMIT_SESSION_MAX
});

const qrLimiter = make({
  windowMs: env.RATE_LIMIT_QR_WINDOW_MS,
  max: env.RATE_LIMIT_QR_MAX
});

const syncLimiter = make({
  windowMs: env.RATE_LIMIT_SYNC_WINDOW_MS,
  max: env.RATE_LIMIT_SYNC_MAX
});

module.exports = {
  globalLimiter,
  authLimiter,
  writeLimiter,
  broadcastLimiter,
  sessionLifecycleLimiter,
  qrLimiter,
  syncLimiter
};