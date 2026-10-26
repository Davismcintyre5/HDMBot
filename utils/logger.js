const pino = require('pino');
const env = require('../config/env');

const options = {
  level: env.LOG_LEVEL,
  base: { app: 'hdm-bot', env: env.NODE_ENV },
  redact: {
    paths: [
      '*.creds',
      '*.keys',
      '*.passwordHash',
      '*.password',
      '*.JWT_SECRET',
      'req.headers.authorization',
      'auth.token'
    ],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime
};

let logger;

if (env.LOG_FORMAT === 'pretty' && env.isDev) {
  logger = pino(options, {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,app,env'
    }
  });
} else {
  logger = pino(options);
}

module.exports = logger;