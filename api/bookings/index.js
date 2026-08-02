const { pool, initDb } = require('../db');
const crypto = require('crypto');

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

const { handleError } = require('../error');

module.exports = async (req, res) => {
  try {
    await initDb();
    const { method, query } = req;

    if (method === 'GET') {
      const date = query.date;
      if (!date) {
        return jsonResponse(res, 400, { error: 'Missing date query param' });
      }

      const result = await pool.query(
        'SELECT id, date, time, customer_name AS customerName, phone, service FROM bookings WHERE date = $1 ORDER BY time ASC',
        [date]
      );
      return jsonResponse(res, 200, result.rows);
    }

    if (method === 'POST') {
      const { date, time, customerName, phone, service } = parseBody(req);
      if (!date || !time || !customerName) {
        return jsonResponse(res, 400, { error: 'date, time, and customerName are required' });
      }

      const id = crypto.randomUUID();
      try {
        await pool.query(
          'INSERT INTO bookings (id, date, time, customer_name, phone, service) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, date, time, customerName, phone || null, service || null]
        );
      } catch (error) {
        if (error.code === '23505') {
          return jsonResponse(res, 409, { error: 'Timeslot already booked' });
        }
        return jsonResponse(res, 500, { error: 'Unable to save booking' });
      }

      return jsonResponse(res, 201, { id, date, time, customerName, phone, service });
    }

    return jsonResponse(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return handleError(res, error);
  }
};
