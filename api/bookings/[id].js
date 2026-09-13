const { pool, initDb } = require('../db');
const { isAdmin } = require('../auth');
const { callSupabaseBookingEmail } = require('../email-notify');

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
  if (!label || typeof label !== 'string') return null;

  const normalized = label.trim().replace(/\u00A0|\u202F/g, ' ');
  const m = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return null;

  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ampm = (m[3] || '').toUpperCase();

  if (ampm) {
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

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

module.exports = async (req, res) => {
  await initDb();
  const { method, query } = req;
  const { id } = query;

  if (!id) {
    return jsonResponse(res, 400, { error: 'Missing booking id' });
  }

  if (method === 'DELETE') {
    if (!isAdmin(req)) {
      return jsonResponse(res, 401, { error: 'Unauthorized' });
    }

    const existing = await pool.query(
      "SELECT id, date, time, customer_name AS \"customerName\", phone, email, service, COALESCE(status, 'pending') AS status FROM bookings WHERE id = $1",
      [id]
    );

    if (existing.rowCount === 0) {
      return jsonResponse(res, 404, { error: 'Booking not found' });
    }

    if (existing.rows[0].status === 'cancelled') {
      return jsonResponse(res, 409, { error: 'Booking already cancelled' });
    }

    const result = await pool.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING id, date, time, customer_name AS \"customerName\", phone, email, service, COALESCE(status, 'pending') AS status",
      [id]
    );

    try {
      await callSupabaseBookingEmail({
        type: 'cancellation',
        booking: {
          id: result.rows[0].id,
          date: result.rows[0].date,
          time: result.rows[0].time,
          customerName: result.rows[0].customerName,
          phone: result.rows[0].phone,
          email: result.rows[0].email,
          service: result.rows[0].service,
          status: 'cancelled',
        },
      });
    } catch (error) {
      console.error('Cancellation email trigger failed:', error);
    }

    return jsonResponse(res, 200, result.rows[0]);
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

    // Validate time slot
    const minutes = parseTimeLabelToMinutes(time);
    if (minutes === null || !ALLOWED_SLOT_MINUTES.has(minutes)) {
      return jsonResponse(res, 400, { error: 'Invalid or unavailable time slot' });
    }

    try {
      const result = await pool.query(
        'UPDATE bookings SET date = $1, time = $2, customer_name = $3, phone = $4, email = $5, service = $6 WHERE id = $7 RETURNING id, date, time, customer_name AS "customerName", phone, email, service',
        [date, time, customerName, phone || null, body.email || null, service || null, id]
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
