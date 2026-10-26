require('./scripts/dnsSet');
require('./scripts/suppressBaileysNoise');
const env = require('./config/env');
const logger = require('./utils/logger');

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');

const db = require('./config/db');
const socket = require('./config/socket');
const sessionManager = require('./whatsapp/sessionManager');
const commandRegistry = require('./core/commandRegistry');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const clientDistDir = path.join(__dirname, 'client', 'dist');
const clientIndexPath = path.join(clientDistDir, 'index.html');
const hasClientBuild = fs.existsSync(clientIndexPath);

if (hasClientBuild) {
  app.use(express.static(clientDistDir, { index: false }));
}

require('./routes').mount(app, {
  clientIndexPath: hasClientBuild ? clientIndexPath : null
});

if (hasClientBuild) {
  logger.info({ dir: clientDistDir }, 'serving client build');
} else if (env.isProd) {
  logger.warn({ dir: clientDistDir }, 'client build not found in production');
}

const httpServer = http.createServer(app);
socket.createSocketServer(httpServer);

let shuttingDown = false;

function printBanner() {
  let sessionCount = 0;
  try {
    sessionCount = sessionManager.listSessions().length;
  } catch {
    sessionCount = 0;
  }

  const rows = [
    ['Bot', `${env.BOT_NAME} v3.0.0`],
    ['Env', env.NODE_ENV],
    ['Port', String(env.PORT)],
    ['Owner', env.OWNER_NAME],
    ['Mongo', mongoose.connection.readyState === 1 ? 'connected' : 'down'],
    ['Redis', env.REDIS_ENABLED ? 'enabled' : 'disabled'],
    ['Cloudinary', env.CLOUDINARY_ENABLED ? 'configured' : 'disabled'],
    ['Sessions', String(sessionCount)],
    ['Client', hasClientBuild ? 'dist' : 'not built'],
    ['Time', new Date().toISOString()]
  ];
  const width = 44;
  const line = '═'.repeat(width - 2);
  console.log('');
  console.log(`╔${line}╗`);
  for (const [k, v] of rows) {
    const text = ` ${k}: ${v}`;
    console.log(`║${text.padEnd(width - 2)}║`);
  }
  console.log(`╚${line}╝`);
  console.log('');
}

async function syncIndexes() {
  const models = [
    require('./models/Session'),
    require('./models/Message'),
    require('./models/Setting'),
    require('./models/EventLog'),
    require('./models/AdminUser'),
    require('./models/Rule'),
    require('./models/Contact'),
    require('./models/Command')
  ];
  const log = [];
  for (const Model of models) {
    await Model.syncIndexes();
    log.push(`${Model.modelName}(${Object.keys(Model.schema.indexes()).length})`);
  }
  logger.info({ indexes: log.join(' ') }, 'indexes synced');
}

async function bootstrap() {
  await db.connect();

  await commandRegistry.sync();

  await syncIndexes();

  if (env.AUTO_CONNECT_DEFAULT) {
    await sessionManager.boot();
  }

  await require('./schedulers').startAll();

  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(env.PORT, () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });

  printBanner();
  logger.info({ port: env.PORT }, 'server listening');
}

async function shutdown(signal) {
  if (shuttingDown) {
    logger.warn({ signal }, 'shutdown already in progress — forcing exit');
    process.exit(1);
  }
  shuttingDown = true;
  logger.warn({ signal }, 'shutting down');

  const hardTimeout = setTimeout(() => {
    logger.error('shutdown timed out — forcing exit');
    process.exit(1);
  }, env.SHUTDOWN_FLUSH_TIMEOUT_MS + 7000);
  hardTimeout.unref();

  try {
    await new Promise((r) => httpServer.close(() => r()));
  } catch (err) {
    logger.error({ err }, 'httpServer.close failed');
  }

  try {
    socket.closeSocketServer();
  } catch (err) {
    logger.error({ err }, 'socket close failed');
  }

  try {
    await require('./schedulers').stopAll();
  } catch (err) {
    logger.error({ err }, 'schedulers stop failed');
  }

  try {
    await sessionManager.shutdownAll();
  } catch (err) {
    logger.error({ err }, 'sessionManager shutdown failed');
  }

  try {
    await db.shutdown();
  } catch (err) {
    logger.error({ err }, 'db shutdown failed');
  }

  try {
    await require('./config/redis').shutdown();
  } catch (err) {
    logger.error({ err }, 'redis shutdown failed');
  }

  clearTimeout(hardTimeout);
  logger.info('shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'uncaughtException');
  if (env.isProd) process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
  if (env.isProd) process.exit(1);
});

bootstrap().catch((err) => {
  logger.error({ err }, 'bootstrap failed');
  process.exit(1);
});