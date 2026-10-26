const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const noopClient = {
  status: 'disabled',
  get: async () => null,
  set: async () => 'OK',
  setex: async () => 'OK',
  del: async () => 0,
  expire: async () => 0,
  incr: async () => 0,
  exists: async () => 0,
  keys: async () => [],
  mget: async () => [],
  hget: async () => null,
  hset: async () => 0,
  hdel: async () => 0,
  quit: async () => 'OK',
  disconnect: () => {},
  on: () => noopClient
};

let client = null;

function createClient() {
  if (!env.REDIS_ENABLED) return noopClient;
  if (client) return client;

  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('ready', () => logger.info('Redis ready'));
  client.on('error', (err) => logger.error({ err }, 'Redis error'));
  client.on('close', () => logger.warn('Redis connection closed'));

  return client;
}

function isEnabled() {
  return env.REDIS_ENABLED;
}

async function shutdown() {
  if (client) {
    await client.quit();
    client = null;
  }
}

module.exports = { createClient, isEnabled, shutdown };