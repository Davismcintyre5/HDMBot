const logger = require('../../utils/logger');

const SKIP_PREFIXES = ['/api/health', '/health', '/status', '/qr-status', '/socket.io'];

module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    if (req.method === 'OPTIONS' && res.statusCode === 204) return;
    if (SKIP_PREFIXES.some((p) => req.originalUrl.startsWith(p))) return;

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const payload = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
      ua: req.get('user-agent') || ''
    };

    if (res.statusCode >= 500) logger.error(payload, 'request');
    else if (res.statusCode >= 400) logger.warn(payload, 'request');
    else logger.info(payload, 'request');
  });

  next();
};