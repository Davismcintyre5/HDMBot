class ApiResponse {
  constructor(statusCode, data, message) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message || (this.success ? 'OK' : 'Error');
    this.data = data === undefined ? null : data;
    this.timestamp = new Date().toISOString();
  }
}

function send(res, statusCode, data, message) {
  const payload = new ApiResponse(statusCode, data, message);
  return res.status(statusCode).json(payload);
}

module.exports = { ApiResponse, send };