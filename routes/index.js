const cors = require('../middleware/global/cors');
const helmet = require('../middleware/global/helmet');
const requestLogger = require('../middleware/global/requestLogger');
const { globalLimiter } = require('../middleware/global/rateLimiter');
const { notFound, errorHandler } = require('../middleware/global/errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const healthController = require('../controllers/healthController');
const env = require('../config/env');

function mount(app, options = {}) {
  const { clientIndexPath } = options;

  app.use(cors);
  app.use(helmet);
  app.use(requestLogger);

  app.get('/api', (req, res) => {
    res.json({
      success: true,
      name: env.BOT_NAME,
      version: '3.0.0',
      env: env.NODE_ENV,
      endpoints: [
        '/health',
        '/api/health',
        '/api/health/detailed',
        '/api/auth',
        '/api/sessions',
        '/api/commands',
        '/api/rules',
        '/api/contacts',
        '/api/settings',
        '/api/dashboard',
        '/api/broadcast',
        '/api/qr'
      ]
    });
  });

  app.get('/health', asyncHandler(healthController.health));
  app.get('/api/health', asyncHandler(healthController.health));

  app.use('/api', globalLimiter);

  app.use('/api/auth', require('./authRoutes'));
  app.use('/api/sessions', require('./sessionsRoutes'));
  app.use('/api/commands', require('./commandsRoutes'));
  app.use('/api/rules', require('./rulesRoutes'));
  app.use('/api/contacts', require('./contactsRoutes'));
  app.use('/api/settings', require('./settingsRoutes'));
  app.use('/api/dashboard', require('./dashboardRoutes'));
  app.use('/api/broadcast', require('./broadcastRoutes'));
  app.use('/api/qr', require('./qrRoutes'));

  if (clientIndexPath) {
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/socket.io')
      ) {
        return next();
      }
      res.sendFile(clientIndexPath);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
}

module.exports = { mount };