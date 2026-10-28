const cors = require('../middleware/global/cors');
const helmet = require('../middleware/global/helmet');
const requestLogger = require('../middleware/global/requestLogger');
const { globalLimiter } = require('../middleware/global/rateLimiter');
const { notFound, errorHandler } = require('../middleware/global/errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const healthController = require('../controllers/healthController');
const env = require('../config/env');

const PROBE_PREFIXES = [
  '/wp-', '/wp/', '/wordpress', '/phpmyadmin', '/pma', '/adminer',
  '/cpanel', '/webmail', '/phpinfo', '/info.php', '/xmlrpc',
  '/.env', '/.git', '/.svn', '/.hg', '/.aws', '/.ssh', '/.docker',
  '/.kube', '/.terraform', '/.lfs', '/.hgrc', '/.dockercfg',
  '/_next', '/_nuxt', '/_astro', '/_app'
];

const PROBE_PATTERNS = [
  /\.(env|git|svn|hg|php|asp|aspx|jsp|config|conf|yml|yaml|xml|bak|old|save|swp|log|sql|db|sqlite|map|pem|key|crt|tfstate|tfvars)$/i,
  /\/\.(env|git|svn|hg|aws|ssh|docker|kube|terraform|lfs)/i,
  /(^|\/)\.(env|git|svn|hg|aws|ssh|docker|kube|terraform|lfs)/i,
  /\.git\//i,
  /\.svn\//i,
  /\.hg\//i,
  /\.terraform\//i,
  /kubeconfig/i,
  /docker-compose/i,
  /terraform\.tfstate/i
];

const SPA_ROUTES = new Set([
  '/',
  '/login',
  '/qr',
  '/devices',
  '/rules',
  '/commands',
  '/broadcast',
  '/contacts',
  '/settings',
  '/health',
  '/not-found'
]);

function isProbe(reqPath) {
  if (!reqPath) return false;

  if (PROBE_PREFIXES.some((p) => reqPath.startsWith(p))) return true;

  if (PROBE_PATTERNS.some((re) => re.test(reqPath))) return true;

  const lastSegment = reqPath.split('/').pop() || '';
  if (lastSegment.startsWith('.')) return true;
  if (lastSegment.includes('..')) return true;

  if (reqPath === '/v2/' || reqPath === '/v1/' || reqPath === '/v3/') return true;
  if (reqPath.startsWith('/-/')) return true;

  return false;
}

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

  app.use('/health', require('./healthRoutes'));
  app.use('/api/health', require('./healthRoutes'));

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
      const p = req.path;

      if (
        p.startsWith('/api') ||
        p.startsWith('/health') ||
        p.startsWith('/socket.io')
      ) {
        return next();
      }

      if (isProbe(p)) {
        return res.status(404).type('txt').send('Not Found');
      }

      if (SPA_ROUTES.has(p)) {
        return res.sendFile(clientIndexPath);
      }

      return res.status(404).type('txt').send('Not Found');
    });
  }

  app.use(notFound);
  app.use(errorHandler);
}

module.exports = { mount };