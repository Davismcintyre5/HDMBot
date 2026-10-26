const env = require('../config/env');
const logger = require('../utils/logger');
const cloudinary = require('../core/cloudinary');
const ownerAlerts = require('../core/ownerAlerts');

let timer = null;
let running = false;
let consecutiveFailures = 0;

async function runOnce() {
  if (running) return { skipped: true };
  running = true;
  const start = Date.now();
  try {
    const result = await cloudinary.cleanupExpired();
    const duration = Date.now() - start;
    logger.info({ ...result, durationMs: duration }, 'cloudinary cleanup run');

    if (result.failed > 0) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 3) {
        await ownerAlerts.send('cloudinary_failed', `Cleanup failing repeatedly (${result.failed} per run)`);
        consecutiveFailures = 0;
      }
    } else {
      consecutiveFailures = 0;
    }
    return result;
  } catch (err) {
    consecutiveFailures += 1;
    logger.error({ err }, 'cloudinary cleanup crashed');
    if (consecutiveFailures >= 3) {
      await ownerAlerts.send('cloudinary_failed', `Cleanup crashed: ${err.message}`);
      consecutiveFailures = 0;
    }
    return { destroyed: 0, failed: 1, skipped: 0 };
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  if (!env.CLOUDINARY_ENABLED) {
    logger.info('cloudinary cleanup scheduler disabled (Cloudinary not configured)');
    return;
  }
  const interval = env.CLOUDINARY_CLEANUP_INTERVAL_MS;
  timer = setInterval(() => {
    runOnce().catch((err) => logger.error({ err }, 'cloudinary cleanup uncaught'));
  }, interval);
  if (timer.unref) timer.unref();

  setTimeout(() => {
    runOnce().catch((err) => logger.error({ err }, 'cloudinary cleanup initial'));
  }, 10000).unref?.();

  logger.info({ intervalMs: interval }, 'cloudinary cleanup started');
}

async function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  const start = Date.now();
  while (running && Date.now() - start < 10000) {
    await new Promise((r) => setTimeout(r, 200));
  }
  logger.info('cloudinary cleanup stopped');
}

module.exports = { start, stop, runOnce };