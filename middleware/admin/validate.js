const Joi = require('joi');
const ApiError = require('../../utils/apiError');

function build(schema, source) {
  return function validate(req, res, next) {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    if (error) {
      const fields = {};
      for (const detail of error.details) {
        const key = detail.path.join('.') || '_';
        if (!fields[key]) fields[key] = detail.message;
      }
      return next(ApiError.badRequest('Validation failed', 'VALIDATION_FAILED', { fields }));
    }
    req[source] = value;
    next();
  };
}

function validate(schema, source = 'body') {
  return build(schema, source);
}

function validateParams(schema) {
  return build(schema, 'params');
}

function validateQuery(schema) {
  return build(schema, 'query');
}

module.exports = validate;
module.exports.validate = validate;
module.exports.validateParams = validateParams;
module.exports.validateQuery = validateQuery;