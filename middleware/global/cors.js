const cors = require('cors');
const env = require('../../config/env');

const options = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

module.exports = cors(options);