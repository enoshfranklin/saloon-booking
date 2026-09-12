const { pool, initDb } = require('../db');
const crypto = require('crypto');

// Allowed slot minutes since midnight (same schedule as frontend)
const ALLOWED_SLOT_MINUTES = new Set([
  10 * 60 + 30,
  11 * 60 + 15,
  12 * 60 + 0,
  12 * 60 + 45,
  14 * 60 + 30,
  15 * 60 + 15,
  16 * 60 + 0,
  16 * 60 + 45,
  17 * 60 + 30,
  18 * 60 + 15,
  19 * 60 + 0,
]);

function parseTimeLabelToMinutes(label) {
  // Expect formats like "10:30 AM" or "2:30 PM"
  if (!label || typeof label !== 'string') return null;
  const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

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
        "SELECT id, date, time, COALESCE(status, 'pending') AS status FROM bookings WHERE date = $1 AND COALESCE(status, 'pending') IN ('pending', 'confirmed') ORDER BY time ASC",
        [date]
      );
      return jsonResponse(res, 200, result.rows);
    }

    if (method === 'POST') {
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

      // Validate time slot is allowed
      const minutes = parseTimeLabelToMinutes(time);
      if (minutes === null || !ALLOWED_SLOT_MINUTES.has(minutes)) {
        return jsonResponse(res, 400, { error: 'Invalid or unavailable time slot' });
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
