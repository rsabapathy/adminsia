function notFound(req, res, next) {
  res.status(404);
  res.json({ message: 'Not found' });
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  const status = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status);
  res.json({
    message: err.message || 'Server error',
  });
}

module.exports = { notFound, errorHandler };
