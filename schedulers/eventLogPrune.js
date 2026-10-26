const cron = require('node-cron');
const env = require('../config/env');
const logger = require('../utils/logger');
const EventLog = require('../models/EventLog');

let task = null;
let running = false;

async function runOnce() {
  if (!env.EVENTLOG_ENABLED) return { pruned: 0 };
  if (running) return { skipped: true };
  running = true;
  try {
    const cutoff = new Date(Date.now() - env.EVENTLOG_TTL_DAYS * 86400 * 1000);
    const result = await EventLog.deleteMany({ timestamp: { $lt: cutoff } });
    logger.info({ pruned: result.deletedCount, cutoff }, 'eventlog prune run');
    return { pruned: result.deletedCount || 0 };
  } catch (err) {
    logger.error({ err }, 'eventlog prune crashed');
    return { pruned: 0 };
  } finally {
    running = false;
  }
}

function start() {
  if (task) return;
  if (!env.EVENTLOG_ENABLED) {
    logger.info('eventlog prune scheduler disabled (EVENTLOG_ENABLED=false)');
    return;
  }
  task = cron.schedule('0 3 * * *', () => {
    runOnce().catch((err) => logger.error({ err }, 'eventlog prune uncaught'));
  });
  logger.info('eventlog prune started (daily 03:00)');
}

async function stop() {
  if (task) {
    task.stop();
    task = null;
  }
  const started = Date.now();
  while (running && Date.now() - started < 5000) {
    await new Promise((r) => setTimeout(r, 200));
  }
  logger.info('eventlog prune stopped');
}

module.exports = { start, stop, runOnce };