const logger = require('../../utils/logger');

const CATEGORIES = [
  'general',
  'admin',
  'group',
  'media',
  'ai',
  'utility',
  'fun',
  'bug',
  'settings'
];

const registry = new Map();
const aliasMap = new Map();
const categoryMap = new Map();

function loadCategory(name) {
  try {
    const mod = require(`./${name}`);
    const commands = Array.isArray(mod) ? mod : [];
    for (const cmd of commands) {
      if (!cmd.name) {
        logger.warn({ category: name }, 'command missing name');
        continue;
      }
      const key = cmd.name.toLowerCase();
      if (registry.has(key)) {
        logger.warn({ name: key }, 'duplicate command name');
        continue;
      }
      registry.set(key, { ...cmd, category: cmd.category || name });
      categoryMap.set(key, cmd.category || name);
      for (const alias of cmd.aliases || []) {
        const a = String(alias).toLowerCase();
        if (aliasMap.has(a)) continue;
        aliasMap.set(a, key);
      }
    }
    logger.debug({ category: name, count: commands.length }, 'loaded category');
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      logger.error({ err, category: name }, 'category load failed');
    }
  }
}

for (const cat of CATEGORIES) loadCategory(cat);

logger.info({ commands: registry.size, categories: CATEGORIES.length }, 'command registry loaded');

function all() {
  return Array.from(registry.values());
}

function get(name) {
  return registry.get(String(name || '').toLowerCase()) || null;
}

function resolveAlias(name) {
  const key = String(name || '').toLowerCase();
  if (registry.has(key)) return key;
  return aliasMap.get(key) || null;
}

function byCategory() {
  const out = {};
  for (const cmd of registry.values()) {
    const cat = cmd.category || 'general';
    if (!out[cat]) out[cat] = [];
    out[cat].push(cmd);
  }
  return out;
}

function aliases() {
  return aliasMap;
}

module.exports = { all, get, resolveAlias, byCategory, aliases };