const env = require('../../config/env');
const logger = require('../../utils/logger');
const ApiError = require('../../utils/apiError');

function notFound(req, res, next) {
  next(ApiError.notFound(`Not found: ${req.method} ${req.originalUrl}`));
}

function normalize(err) {
  if (err instanceof ApiError) return err;

  if (err.name === 'ValidationError' && err.errors) {
    const fields = {};
    for (const [k, v] of Object.entries(err.errors)) fields[k] = v.message;
    return ApiError.badRequest('Validation failed', 'VALIDATION_FAILED', { fields });
  }

  if (err.name === 'CastError') {
    return ApiError.badRequest(`Invalid ${err.path || 'id'}`);
  }

  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    return ApiError.conflict(`Duplicate ${field}`);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Invalid or expired token');
  }

  if (err.type === 'entity.parse.failed') {
    return ApiError.badRequest('Invalid JSON body');
  }

  if (err.type === 'entity.too.large') {
    return ApiError.badRequest('Request body too large');
  }

  return ApiError.internal('Internal server error');
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const apiErr = normalize(err);
  const payload = { method: req.method, url: req.originalUrl };

  if (apiErr.statusCode >= 500) {
    logger.error({ err, stack: err.stack, ...payload }, apiErr.message);
  } else {
    logger.warn({ err: apiErr, ...payload }, apiErr.message);
  }

  const body = {
    success: false,
    error: apiErr.expose ? apiErr.message : 'Internal server error',
    code: apiErr.code
  };
  if (apiErr.details) body.details = apiErr.details;
  if (!env.isProd && err.stack) body.stack = err.stack;

  res.status(apiErr.statusCode).json(body);
}

module.exports = { notFound, errorHandler };