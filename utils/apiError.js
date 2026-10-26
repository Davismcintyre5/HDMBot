class ApiError extends Error {
  constructor(statusCode, message, code, details) {
    super(message || 'Error');
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.details = details;
    this.isOperational = statusCode >= 400 && statusCode < 500;
    this.expose = this.isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new ApiError(429, message, code);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL') {
    return new ApiError(500, message, code);
  }

  static external(service, message = 'External service error', code = 'EXTERNAL') {
    return new ApiError(502, `${service}: ${message}`, code);
  }
}

module.exports = ApiError;