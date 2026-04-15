function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.url} → ${status}: ${message}`);
  if (err.response) {
    console.error(`[ERROR] External API: ${err.response.status} ${err.config?.url}`);
  }

  res.status(status).json({
    error: true,
    message,
    service: err.service || undefined,
  });
}

module.exports = errorHandler;
