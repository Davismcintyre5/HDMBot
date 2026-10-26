const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

const COMMANDS_DIR = __dirname;
const SKIP_FILES = new Set(['index.js']);

const registry = new Map();
const aliasMap = new Map();

function listCategoryFiles() {
  try {
    return fs
      .readdirSync(COMMANDS_DIR)
      .filter((f) => f.endsWith('.js') && !SKIP_FILES.has(f))
      .map((f) => f.replace(/\.js$/, ''))
      .sort();
  } catch (err) {
    logger.error({ err }, 'commands: readdir failed');
    return [];
  }
}

function loadCategory(name) {
  let mod;
  try {
    mod = require(`./${name}`);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      logger.error({ err, category: name }, 'category load failed');
    }
    return 0;
  }

  const commands = Array.isArray(mod) ? mod : [];
  let loaded = 0;

  for (const cmd of commands) {
    if (!cmd || !cmd.name) {
      logger.warn({ category: name }, 'command missing name');
      continue;
    }
    if (typeof cmd.run !== 'function') {
      logger.warn({ name: cmd.name, category: name }, 'command missing run()');
      continue;
    }

    const key = String(cmd.name).toLowerCase();
    if (registry.has(key)) {
      logger.warn({ name: key, category: name }, 'duplicate command name');
      continue;
    }

    registry.set(key, {
      ...cmd,
      name: key,
      category: cmd.category || name,
      aliases: Array.isArray(cmd.aliases)
        ? cmd.aliases.map((a) => String(a).toLowerCase())
        : []
    });

    for (const alias of cmd.aliases || []) {
      const a = String(alias).toLowerCase();
      if (aliasMap.has(a)) continue;
      if (registry.has(a)) continue;
      aliasMap.set(a, key);
    }

    loaded++;
  }

  if (loaded > 0) {
    logger.debug({ category: name, count: loaded }, 'category loaded');
  }
  return loaded;
}

const files = listCategoryFiles();
const categoryCounts = {};

for (const name of files) {
  categoryCounts[name] = loadCategory(name);
}

const totalCommands = registry.size;
const totalAliases = aliasMap.size;
const activeCategories = Object.entries(categoryCounts)
  .filter(([, n]) => n > 0)
  .map(([name]) => name);

logger.info(
  {
    commands: totalCommands,
    aliases: totalAliases,
    categories: activeCategories
  },
  'command registry loaded'
);

if (totalCommands === 0) {
  logger.warn('command registry is empty — no category files found');
}

function all() {
  return Array.from(registry.values());
}

function get(name) {
  return registry.get(String(name || '').toLowerCase()) || null;
}

function has(name) {
  return registry.has(String(name || '').toLowerCase());
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

function categories() {
  return Object.keys(byCategory()).sort();
}

function reload() {
  for (const name of Object.keys(require.cache)) {
    if (name.startsWith(COMMANDS_DIR) && !name.endsWith('index.js')) {
      delete require.cache[name];
    }
  }
  registry.clear();
  aliasMap.clear();

  for (const name of files) {
    loadCategory(name);
  }

  logger.info(
    {
      commands: registry.size,
      aliases: aliasMap.size,
      categories: Object.keys(byCategory()).sort()
    },
    'command registry reloaded'
  );
}

module.exports = {
  all,
  get,
  has,
  resolveAlias,
  byCategory,
  aliases,
  categories,
  reload
};