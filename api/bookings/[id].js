const { pool, initDb } = require('../db');
const { isAdmin } = require('../auth');

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      throw new Error('Invalid JSON body');
    }
  }
  return req.body;
}

module.exports = async (req, res) => {
  await initDb();
  const { method, query } = req;
  const { id } = query;

  if (!id) {
    return jsonResponse(res, 400, { error: 'Missing booking id' });
  }

  if (method === 'DELETE') {
    const cancelToken = req.headers['x-cancel-token'];
    if (!cancelToken || cancelToken !== id) {
      if (!isAdmin(req)) {
        return jsonResponse(res, 401, { error: 'Unauthorized' });
      }
    }

    const result = await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return jsonResponse(res, 404, { error: 'Booking not found' });
    }
    return jsonResponse(res, 204, {});
  }

  if (!isAdmin(req)) {
    return jsonResponse(res, 401, { error: 'Unauthorized' });
  }

  if (method === 'PUT') {
    let body;
    try {
      body = parseBody(req);
    } catch (error) {
      return jsonResponse(res, 400, { error: error.message });
    }
    const { date, time, customerName, phone, service } = body;
    if (!date || !time || !customerName) {
      return jsonResponse(res, 400, { error: 'date, time, and customerName are required' });
    }

    try {
      const result = await pool.query(
        'UPDATE bookings SET date = $1, time = $2, customer_name = $3, phone = $4, service = $5 WHERE id = $6 RETURNING id, date, time, customer_name AS "customerName", phone, service',
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

  return jsonResponse(res, 405, { error: 'Method not allowed' });
};
