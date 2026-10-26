function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn.call(this, req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;