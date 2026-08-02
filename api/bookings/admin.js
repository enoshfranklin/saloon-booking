const { pool, initDb } = require('../db');
const { isAdmin } = require('../auth');
const { handleError } = require('../error');

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return jsonResponse(res, 401, { error: 'Unauthorized' });
    }

    await initDb();
    const { method, query } = req;

    if (method !== 'GET') {
      return jsonResponse(res, 405, { error: 'Method not allowed' });
    }

    const date = query.date;
    if (!date) {
      return jsonResponse(res, 400, { error: 'Missing date query param' });
    }

    const result = await pool.query(
      'SELECT id, date, time, customer_name AS "customerName", phone, service FROM bookings WHERE date = $1 ORDER BY time ASC',
      [date]
    );

    return jsonResponse(res, 200, result.rows);
  } catch (error) {
    return handleError(res, error);
  }
};
