const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const os = require('os');

function fail(msg) {
  throw new Error(`ENV: ${msg}`);
}

function reqStr(key) {
  const v = process.env[key];
  if (!v || v.trim() === '') fail(`${key} is required`);
  return v.trim();
}

function optStr(key, def = '') {
  const v = process.env[key];
  return v && v.trim() !== '' ? v.trim() : def;
}

function optInt(key, def, min, max) {
  const raw = process.env[key];
  if (!raw || raw.trim() === '') return def;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) fail(`${key} must be an integer`);
  if (min !== undefined && n < min) fail(`${key} must be >= ${min}`);
  if (max !== undefined && n > max) fail(`${key} must be <= ${max}`);
  return n;
}

function optBool(key, def = false) {
  const raw = process.env[key];
  if (!raw || raw.trim() === '') return def;
  const v = raw.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(v)) return true;
  if (['false', '0', 'no'].includes(v)) return false;
  fail(`${key} must be true/false`);
}

const NODE_ENV = optStr('NODE_ENV', 'development');
const isProd = NODE_ENV === 'production';
const isDev = !isProd;

const PORT = optInt('PORT', 5000, 1, 65535);
const TIMEZONE = optStr('TIMEZONE', 'UTC');

const BOT_NAME = optStr('BOT_NAME', 'HDM BOT');
const OWNER_NAME = optStr('OWNER_NAME', 'Owner');
const OWNER_NUMBER = reqStr('OWNER_NUMBER');
if (!/^\d{10,15}$/.test(OWNER_NUMBER)) fail('OWNER_NUMBER must be 10-15 digits (no +, no spaces)');

const BOT_OWNER_NUMBER_RAW = optStr('BOT_OWNER_NUMBER', '');
if (BOT_OWNER_NUMBER_RAW && !/^\d{10,15}$/.test(BOT_OWNER_NUMBER_RAW)) {
  fail('BOT_OWNER_NUMBER must be 10-15 digits if set');
}
const BOT_OWNER_NUMBER = BOT_OWNER_NUMBER_RAW;

const OWNER_LID_RAW = optStr('OWNER_LID', '');
if (OWNER_LID_RAW && !/^\d{6,25}$/.test(OWNER_LID_RAW)) {
  fail('OWNER_LID must be 6-25 digits if set');
}
const OWNER_LID = OWNER_LID_RAW;

const DEFAULT_PREFIX = optStr('DEFAULT_PREFIX', '.');
if (!/^[!-/:-@\[-`{-~]$/.test(DEFAULT_PREFIX)) {
  fail('DEFAULT_PREFIX must be a single ASCII punctuation character');
}

const SESSION_ID = optStr('SESSION_ID', 'HDM-BOT-SESSION');
const AUTO_CONNECT_DEFAULT = optBool('AUTO_CONNECT_DEFAULT', true);

const MONGODB_URI = reqStr('MONGODB_URI');
if (!/^mongodb(\+srv)?:\/\/.+/.test(MONGODB_URI)) {
  fail('MONGODB_URI malformed');
}
const _mongoDbName = MONGODB_URI.split('?')[0].split('/').pop();
if (!_mongoDbName) fail('MONGODB_URI must include a database name');

const REDIS_URL = optStr('REDIS_URL', '');

const BACKUP_DEBOUNCE_MS = optInt('BACKUP_DEBOUNCE_MS', 5000, 500, 600000);
const SHUTDOWN_FLUSH_TIMEOUT_MS = optInt('SHUTDOWN_FLUSH_TIMEOUT_MS', 8000, 1000, 120000);
if (BACKUP_DEBOUNCE_MS >= SHUTDOWN_FLUSH_TIMEOUT_MS) {
  throw new Error(
    `ENV: BACKUP_DEBOUNCE_MS (${BACKUP_DEBOUNCE_MS}) must be < SHUTDOWN_FLUSH_TIMEOUT_MS (${SHUTDOWN_FLUSH_TIMEOUT_MS})`
  );
}

const ANTICACHE_TTL_HOURS = optInt('ANTICACHE_TTL_HOURS', 24, 1, 168);
const MESSAGE_TTL_HOURS = optInt('MESSAGE_TTL_HOURS', 26, 2, 720);
if (ANTICACHE_TTL_HOURS >= MESSAGE_TTL_HOURS) {
  fail('ANTICACHE_TTL_HOURS must be < MESSAGE_TTL_HOURS (cleanup cron needs buffer before TTL)');
}
const CLOUDINARY_CLEANUP_INTERVAL_MS = optInt(
  'CLOUDINARY_CLEANUP_INTERVAL_MS',
  3600000,
  60000,
  86400000
);

const CLOUDINARY_CLOUD_NAME = optStr('CLOUDINARY_CLOUD_NAME', '');
const CLOUDINARY_API_KEY = optStr('CLOUDINARY_API_KEY', '');
const CLOUDINARY_API_SECRET = optStr('CLOUDINARY_API_SECRET', '');
const CLOUDINARY_FOLDER = optStr('CLOUDINARY_FOLDER', 'hdm-anticache');

const CLOUDINARY_ENABLED = !!(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);
if (!CLOUDINARY_ENABLED) {
  if (isProd) {
    fail('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are required in production');
  }
  console.warn('⚠️  Cloudinary not configured — anti-delete media recovery disabled');
}

const DEDUP_LRU_SIZE = optInt('DEDUP_LRU_SIZE', 5000, 100, 100000);

const RECONNECT_BASE_MS = optInt('RECONNECT_BASE_MS', 5000, 500, 60000);
const RECONNECT_MULTIPLIER = optInt('RECONNECT_MULTIPLIER', 3, 1, 10);
const RECONNECT_MAX_MS = optInt('RECONNECT_MAX_MS', 300000, 10000, 3600000);
const CONFLICT_RETRY_DELAY_MS = optInt('CONFLICT_RETRY_DELAY_MS', 10000, 1000, 60000);
const CONFLICT_BACKOFF_MS = optInt('CONFLICT_BACKOFF_MS', 60000, 10000, 600000);

const COMMAND_COOLDOWN_MS = optInt('COMMAND_COOLDOWN_MS', 3000, 0, 600000);
const GROUP_CACHE_TTL_MS = optInt('GROUP_CACHE_TTL_MS', 300000, 10000, 3600000);
const SETTINGS_CACHE_TTL_MS = optInt('SETTINGS_CACHE_TTL_MS', 300000, 10000, 3600000);

const MEDIA_DOWNLOAD_RETRIES = optInt('MEDIA_DOWNLOAD_RETRIES', 2, 0, 10);
const MEDIA_DOWNLOAD_RETRY_DELAY_MS = optInt('MEDIA_DOWNLOAD_RETRY_DELAY_MS', 2000, 100, 60000);
const MEDIA_MAX_UPLOAD_BYTES = optInt('MEDIA_MAX_UPLOAD_BYTES', 15728640, 1048576, 104857600);

const LOG_LEVEL = optStr('LOG_LEVEL', 'info');
const LOG_FORMAT = optStr('LOG_FORMAT', 'json');
const EVENTLOG_ENABLED = optBool('EVENTLOG_ENABLED', true);
const EVENTLOG_TTL_DAYS = optInt('EVENTLOG_TTL_DAYS', 7, 1, 365);

const OWNER_ALERTS_ENABLED = optBool('OWNER_ALERTS_ENABLED', true);
const OWNER_ALERT_RATE_LIMIT_MS = optInt(
  'OWNER_ALERT_RATE_LIMIT_MS',
  300000,
  10000,
  86400000
);

const REPLICA_COUNT = optInt('REPLICA_COUNT', 1, 1, 100);
if (REPLICA_COUNT > 1 && !REDIS_URL) {
  fail('REPLICA_COUNT > 1 requires REDIS_URL (session locking)');
}

const RATE_LIMIT_GLOBAL_WINDOW_MS = optInt('RATE_LIMIT_GLOBAL_WINDOW_MS', 60000, 1000, 3600000);
const RATE_LIMIT_GLOBAL_MAX = optInt('RATE_LIMIT_GLOBAL_MAX', 60, 1, 100000);
const RATE_LIMIT_AUTH_WINDOW_MS = optInt('RATE_LIMIT_AUTH_WINDOW_MS', 900000, 1000, 86400000);
const RATE_LIMIT_AUTH_MAX = optInt('RATE_LIMIT_AUTH_MAX', 5, 1, 1000);
const RATE_LIMIT_WRITE_WINDOW_MS = optInt('RATE_LIMIT_WRITE_WINDOW_MS', 60000, 1000, 3600000);
const RATE_LIMIT_WRITE_MAX = optInt('RATE_LIMIT_WRITE_MAX', 30, 1, 100000);
const RATE_LIMIT_BROADCAST_WINDOW_MS = optInt('RATE_LIMIT_BROADCAST_WINDOW_MS', 60000, 1000, 3600000);
const RATE_LIMIT_BROADCAST_MAX = optInt('RATE_LIMIT_BROADCAST_MAX', 3, 1, 1000);
const RATE_LIMIT_SESSION_WINDOW_MS = optInt('RATE_LIMIT_SESSION_WINDOW_MS', 60000, 1000, 3600000);
const RATE_LIMIT_SESSION_MAX = optInt('RATE_LIMIT_SESSION_MAX', 10, 1, 1000);
const RATE_LIMIT_QR_WINDOW_MS = optInt('RATE_LIMIT_QR_WINDOW_MS', 60000, 1000, 3600000);
const RATE_LIMIT_QR_MAX = optInt('RATE_LIMIT_QR_MAX', 30, 1, 1000);
const RATE_LIMIT_SYNC_WINDOW_MS = optInt('RATE_LIMIT_SYNC_WINDOW_MS', 60000, 1000, 3600000);
const RATE_LIMIT_SYNC_MAX = optInt('RATE_LIMIT_SYNC_MAX', 5, 1, 1000);

const API_URL = optStr('API_URL', '');
const KEEP_ALIVE_ENABLED = optBool('KEEP_ALIVE_ENABLED', false);
const KEEP_ALIVE_VERBOSE = optBool('KEEP_ALIVE_VERBOSE', false);

const CORS_ORIGINS = optStr(
  'CORS_ORIGINS',
  'http://localhost:3000,http://localhost:5000,http://localhost:5173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const JWT_SECRET = optStr('JWT_SECRET', '');
if (isProd && JWT_SECRET.length < 32) {
  fail('JWT_SECRET must be >= 32 characters in production');
}
if (isDev && JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET < 32 characters — acceptable in dev only');
}
const JWT_EXPIRES_IN = optStr('JWT_EXPIRES_IN', '7d');

const repoRoot = path.resolve(__dirname, '..');
const _authTmpRaw = optStr('AUTH_TMP_DIR', '');
const AUTH_TMP_DIR = _authTmpRaw
  ? path.resolve(_authTmpRaw)
  : path.join(os.tmpdir(), 'hdm-auth');
if (AUTH_TMP_DIR === repoRoot || AUTH_TMP_DIR.startsWith(repoRoot + path.sep)) {
  fail('AUTH_TMP_DIR must be outside the repository');
}
try {
  fs.mkdirSync(AUTH_TMP_DIR, { recursive: true });
} catch (err) {
  fail(`cannot create AUTH_TMP_DIR ${AUTH_TMP_DIR}: ${err.message}`);
}

const env = {
  NODE_ENV,
  isProd,
  isDev,
  PORT,
  TIMEZONE,

  BOT_NAME,
  OWNER_NAME,
  OWNER_NUMBER,
  BOT_OWNER_NUMBER,
  OWNER_LID,
  DEFAULT_PREFIX,
  SESSION_ID,
  AUTO_CONNECT_DEFAULT,

  MONGODB_URI,
  REDIS_URL,
  REDIS_ENABLED: !!REDIS_URL,

  BACKUP_DEBOUNCE_MS,
  SHUTDOWN_FLUSH_TIMEOUT_MS,
  AUTH_TMP_DIR,

  ANTICACHE_TTL_HOURS,
  MESSAGE_TTL_HOURS,
  CLOUDINARY_CLEANUP_INTERVAL_MS,

  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER,
  CLOUDINARY_ENABLED,

  DEDUP_LRU_SIZE,

  RECONNECT_BASE_MS,
  RECONNECT_MULTIPLIER,
  RECONNECT_MAX_MS,
  CONFLICT_RETRY_DELAY_MS,
  CONFLICT_BACKOFF_MS,

  COMMAND_COOLDOWN_MS,
  GROUP_CACHE_TTL_MS,
  SETTINGS_CACHE_TTL_MS,

  MEDIA_DOWNLOAD_RETRIES,
  MEDIA_DOWNLOAD_RETRY_DELAY_MS,
  MEDIA_MAX_UPLOAD_BYTES,

  LOG_LEVEL,
  LOG_FORMAT,
  EVENTLOG_ENABLED,
  EVENTLOG_TTL_DAYS,

  OWNER_ALERTS_ENABLED,
  OWNER_ALERT_RATE_LIMIT_MS,

  REPLICA_COUNT,

  RATE_LIMIT_GLOBAL_WINDOW_MS,
  RATE_LIMIT_GLOBAL_MAX,
  RATE_LIMIT_AUTH_WINDOW_MS,
  RATE_LIMIT_AUTH_MAX,
  RATE_LIMIT_WRITE_WINDOW_MS,
  RATE_LIMIT_WRITE_MAX,
  RATE_LIMIT_BROADCAST_WINDOW_MS,
  RATE_LIMIT_BROADCAST_MAX,
  RATE_LIMIT_SESSION_WINDOW_MS,
  RATE_LIMIT_SESSION_MAX,
  RATE_LIMIT_QR_WINDOW_MS,
  RATE_LIMIT_QR_MAX,
  RATE_LIMIT_SYNC_WINDOW_MS,
  RATE_LIMIT_SYNC_MAX,

  API_URL,
  KEEP_ALIVE_ENABLED,
  KEEP_ALIVE_VERBOSE,

  CORS_ORIGINS,
  JWT_SECRET,
  JWT_EXPIRES_IN
};

module.exports = Object.freeze(env);