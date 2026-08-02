const { pool, initDb } = require('../db');
const { isAdmin } = require('../auth');

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

module.exports = async (req, res) => {
  await initDb();
  const { method, query } = req;
  const { id } = query;

  if (!id) {
    return jsonResponse(res, 400, { error: 'Missing booking id' });
  }

  if (!isAdmin(req)) {
    return jsonResponse(res, 401, { error: 'Unauthorized' });
  }

  if (method === 'PUT') {
    const { date, time, customerName, phone, service } = parseBody(req);
    if (!date || !time || !customerName) {
      return jsonResponse(res, 400, { error: 'date, time, and customerName are required' });
    }

    try {
      const result = await pool.query(
        'UPDATE bookings SET date = $1, time = $2, customer_name = $3, phone = $4, service = $5 WHERE id = $6 RETURNING id, date, time, customer_name AS customerName, phone, service',
        [date, time, customerName, phone || null, service || null, id]
      );

      if (result.rowCount === 0) {
        return jsonResponse(res, 404, { error: 'Booking not found' });
      }

      return jsonResponse(res, 200, result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return jsonResponse(res, 409, { error: 'Timeslot already booked' });
      }
      return jsonResponse(res, 500, { error: 'Unable to update booking' });
    }
  }

  if (method === 'DELETE') {
    const result = await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return jsonResponse(res, 404, { error: 'Booking not found' });
    }
    return jsonResponse(res, 204, {});
  }

  return jsonResponse(res, 405, { error: 'Method not allowed' });
};
