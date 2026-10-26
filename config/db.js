const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  autoIndex: false
};

let connected = false;

async function connect() {
  if (connected) return mongoose.connection;

  mongoose.connection.on('connected', () => {
    logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB error');
  });

  await mongoose.connect(env.MONGODB_URI, options);

  const ping = await mongoose.connection.db.admin().ping();
  if (!ping || ping.ok !== 1) {
    throw new Error('MongoDB ping failed');
  }

  connected = true;
  return mongoose.connection;
}

async function health() {
  if (!connected) return { connected: false, readyState: mongoose.connection.readyState };
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    return {
      connected: true,
      readyState: mongoose.connection.readyState,
      dbName: mongoose.connection.name,
      pingMs: Date.now() - start
    };
  } catch (err) {
    return { connected: false, readyState: mongoose.connection.readyState, error: err.message };
  }
}

async function shutdown() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

module.exports = { connect, health, shutdown, mongoose };