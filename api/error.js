function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function handleError(res, error) {
  console.error(error);
  const message = error && error.message ? error.message : 'Internal server error';
  return jsonResponse(res, 500, { error: message });
}

module.exports = { handleError };
