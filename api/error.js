function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function handleError(res, error) {
  console.error(error);
  if (error.message && error.message.includes('Database connection string is not configured')) {
    return jsonResponse(res, 500, { error: error.message });
  }
  return jsonResponse(res, 500, { error: 'Internal server error' });
}

module.exports = { handleError };
