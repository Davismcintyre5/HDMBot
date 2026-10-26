const env = require('../config/env');
const logger = require('../utils/logger');
const Command = require('../models/Command');
const descriptors = require('../whatsapp/commands');

const cache = new Map();
let loaded = false;

const PATCH_WHITELIST = [
  'enabled',
  'disabledSessions',
  'cooldownMsOverride',
  'aliasesOverride'
];

function merge(codeDescriptor, dbDoc) {
  const db = dbDoc || {};
  const ownerOnly = !!codeDescriptor.ownerOnly || !!db.ownerOnly;
  const aliases =
    Array.isArray(db.aliasesOverride) && db.aliasesOverride.length > 0
      ? db.aliasesOverride
      : codeDescriptor.aliases || [];
  const cooldownMs =
    db.cooldownMsOverride != null
      ? db.cooldownMsOverride
      : codeDescriptor.cooldownMs != null
      ? codeDescriptor.cooldownMs
      : env.COMMAND_COOLDOWN_MS;

  return {
    name: codeDescriptor.name,
    category: codeDescriptor.category || 'general',
    desc: codeDescriptor.desc || '',
    usage: codeDescriptor.usage || '',
    groupOnly: !!codeDescriptor.groupOnly,
    adminOnly: !!codeDescriptor.adminOnly,
    botAdminNeeded: !!codeDescriptor.botAdminNeeded,
    ownerOnly,
    aliases,
    cooldownMs,
    enabled: db.enabled !== undefined ? db.enabled : true,
    sessionScoped: !!codeDescriptor.sessionScoped,
    disabledSessions: db.disabledSessions || [],
    usageCount: db.usageCount || 0,
    lastUsedAt: db.lastUsedAt || null,
    usageBySession: db.usageBySession || {},
    run: codeDescriptor.run
  };
}

async function sync() {
  const all = descriptors.all();
  if (all.length === 0) {
    logger.warn('commandRegistry.sync: no code descriptors found — check whatsapp/commands/*');
    return;
  }

  const existing = await Command.find().lean();
  const existingByName = new Map(existing.map((d) => [d.name, d]));
  const codeNames = new Set(all.map((d) => d.name));

  let inserted = 0;
  for (const desc of all) {
    if (existingByName.has(desc.name)) continue;

    await Command.create({
      name: desc.name,
      category: desc.category || 'general',
      enabled: true,
      sessionScoped: !!desc.sessionScoped,
      aliasesOverride: [],
      disabledSessions: [],
      ownerOnly: false,
      cooldownMsOverride: null
    });
    inserted++;
  }

  let stale = 0;
  for (const row of existing) {
    if (!codeNames.has(row.name)) {
      stale++;
      logger.warn(
        { name: row.name },
        'stale command in DB (no code descriptor)'
      );
    }
  }

  cache.clear();
  loaded = false;
  await ensureLoaded();

  logger.info(
    {
      commands: all.length,
      inserted,
      stale,
      categories: descriptors.categories()
    },
    'command registry synced'
  );
}

async function ensureLoaded() {
  if (loaded) return;

  const all = descriptors.all();
  const dbDocs = await Command.find().lean();
  const byName = new Map(dbDocs.map((d) => [d.name, d]));

  cache.clear();
  for (const desc of all) {
    cache.set(desc.name, merge(desc, byName.get(desc.name)));
  }
  loaded = true;
}

async function list(filter = {}) {
  await ensureLoaded();
  const out = [];

  for (const cmd of cache.values()) {
    if (filter.category && cmd.category !== filter.category) continue;
    if (filter.enabled !== undefined && cmd.enabled !== filter.enabled) continue;
    if (filter.sessionId) {
      if (!cmd.enabled) continue;
      if (
        cmd.sessionScoped &&
        cmd.disabledSessions.includes(filter.sessionId)
      ) {
        continue;
      }
    }
    out.push(cmd);
  }

  return out;
}

async function get(name) {
  await ensureLoaded();
  return cache.get(String(name || '').toLowerCase()) || null;
}

async function getAlias(name) {
  return descriptors.resolveAlias(name);
}

function refresh() {
  cache.clear();
  loaded = false;
}

async function update(name, patch) {
  const safe = {};
  for (const k of PATCH_WHITELIST) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) safe[k] = patch[k];
  }
  if (Object.keys(safe).length === 0) {
    throw new Error('No valid fields to update');
  }

  const key = String(name).toLowerCase();
  const existing = await Command.findOne({ name: key });
  if (!existing) {
    throw new Error('Command not found');
  }

  await Command.updateOne({ name: key }, { $set: safe });
  refresh();
}

async function recordUsage(name, sessionId) {
  const key = String(name).toLowerCase();
  const update = {
    $inc: {
      usageCount: 1,
      [`usageBySession.${sessionId}`]: 1
    },
    $set: { lastUsedAt: new Date() }
  };
  Command.updateOne({ name: key }, update).catch((err) => {
    logger.warn({ err, name: key }, 'recordUsage failed');
  });
}

async function isDisabledForSession(name, sessionId) {
  const cmd = await get(name);
  if (!cmd) return true;
  if (!cmd.enabled) return true;
  if (cmd.sessionScoped && cmd.disabledSessions.includes(sessionId)) {
    return true;
  }
  return false;
}

async function stats() {
  await ensureLoaded();
  const byCategory = {};
  let enabled = 0;
  let disabled = 0;
  let totalUsage = 0;

  for (const cmd of cache.values()) {
    byCategory[cmd.category] = (byCategory[cmd.category] || 0) + 1;
    if (cmd.enabled) enabled++;
    else disabled++;
    totalUsage += cmd.usageCount || 0;
  }

  return {
    total: cache.size,
    enabled,
    disabled,
    totalUsage,
    byCategory
  };
}

module.exports = {
  sync,
  list,
  get,
  getAlias,
  refresh,
  update,
  recordUsage,
  isDisabledForSession,
  stats
};