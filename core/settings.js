const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');
const Setting = require('../models/Setting');

const VALIDATORS = {
  'prefix': (v) => typeof v === 'string' && /^[!-/:-@\[-`{-~]$/.test(v),
  'anti_delete': (v) => typeof v === 'boolean',
  'welcome.': (v) => typeof v === 'string',
  'goodbye.': (v) => typeof v === 'string',
  'muted.': (v) => typeof v === 'boolean',
  'disabled_commands': (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  'broadcast_delay_ms': (v) => Number.isInteger(v) && v >= 1000 && v <= 30000
};

const DEFAULTS = {
  'prefix': env.DEFAULT_PREFIX,
  'anti_delete': true,
  'disabled_commands': [],
  'broadcast_delay_ms': 3000
};

const cache = new Map();

function cacheKey(sessionId, key) {
  return `${sessionId}::${key}`;
}

function lookupValidator(key) {
  if (VALIDATORS[key]) return VALIDATORS[key];
  for (const [k, fn] of Object.entries(VALIDATORS)) {
    if (k.endsWith('.') && key.startsWith(k)) return fn;
  }
  return null;
}

async function get(sessionId, key) {
  const ck = cacheKey(sessionId, key);
  if (cache.has(ck)) return cache.get(ck);

  const doc = await Setting.findOne({ sessionId, key }).lean();
  const value = doc ? doc.value : (DEFAULTS[key] ?? undefined);
  cache.set(ck, value);
  return value;
}

async function getOrDefault(sessionId, key) {
  const v = await get(sessionId, key);
  if (v !== undefined && v !== null) return v;
  return DEFAULTS[key] !== undefined ? DEFAULTS[key] : null;
}

async function set(sessionId, key, value, updatedBy = null) {
  const validator = lookupValidator(key);
  if (!validator) throw ApiError.badRequest(`Unknown setting key: ${key}`);
  if (!validator(value)) throw ApiError.badRequest(`Invalid value for ${key}`);

  await Setting.findOneAndUpdate(
    { sessionId, key },
    { $set: { value, updatedBy } },
    { upsert: true, new: true }
  );
  cache.set(cacheKey(sessionId, key), value);
}

async function reset(sessionId, key) {
  await Setting.deleteOne({ sessionId, key });
  cache.delete(cacheKey(sessionId, key));
}

async function getAll(sessionId) {
  const docs = await Setting.find({ sessionId }).lean();
  const out = {};
  for (const key of Object.keys(DEFAULTS)) {
    out[key] = { value: DEFAULTS[key], source: 'default' };
  }
  for (const d of docs) {
    out[d.key] = { value: d.value, source: 'db' };
  }
  return out;
}

async function getPrefix(sessionId) {
  const v = await get(sessionId, 'prefix');
  return v || env.DEFAULT_PREFIX;
}

function invalidate(sessionId, key) {
  if (key) cache.delete(cacheKey(sessionId, key));
  else {
    for (const k of cache.keys()) {
      if (k.startsWith(`${sessionId}::`)) cache.delete(k);
    }
  }
}

module.exports = {
  DEFAULTS,
  get,
  getOrDefault,
  set,
  reset,
  getAll,
  getPrefix,
  invalidate
};