const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${status}: ${message}`);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File Upload Error',
      message: 'Invalid file upload',
      code: err.code,
    });
  }

  res.status(status).json({
    error: 'Server Error',
    message,
    code: 'INTERNAL_SERVER_ERROR',
  });
};

module.exports = errorHandler;