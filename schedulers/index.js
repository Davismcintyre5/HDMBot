const logger = require('../utils/logger');
const cloudinaryCleanup = require('./cloudinaryCleanup');
const eventLogPrune = require('./eventLogPrune');

const JOBS = [cloudinaryCleanup, eventLogPrune];

const started = new Set();
let booted = false;

async function startAll() {
  if (booted) return;
  booted = true;
  for (const job of JOBS) {
    try {
      job.start();
      started.add(job);
    } catch (err) {
      logger.error({ err }, 'scheduler start failed');
    }
  }
  logger.info({ count: started.size }, 'schedulers started');
}

async function stopAll() {
  if (!booted) return;
  booted = false;
  for (const job of started) {
    try {
      await job.stop();
    } catch (err) {
      logger.error({ err }, 'scheduler stop failed');
    }
  }
  started.clear();
  logger.info('schedulers stopped');
}

module.exports = { startAll, stopAll, jobs: { cloudinaryCleanup, eventLogPrune } };