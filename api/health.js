const { pool, initDb } = require('./db');

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  try {
    await initDb();
    const result = await pool.query('SELECT 1 AS ok');
    if (result.rows.length === 1) {
      return jsonResponse(res, 200, { status: 'ok', db: true });
    }
    return jsonResponse(res, 500, { status: 'error', db: false });
  } catch (error) {
    return jsonResponse(res, 500, {
      status: 'error',
      db: false,
      message: error.message,
    });
  }
};
