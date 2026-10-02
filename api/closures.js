const { pool, initDb } = require('./db');
const { isAdmin } = require('./auth');
const { isValidBookingDate } = require('./booking-time');
const { handleError } = require('./error');

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body !== 'string') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

module.exports = async (req, res) => {
  try {
    const { method, query } = req;

    if (method !== 'GET' && !isAdmin(req)) {
      return jsonResponse(res, 401, { error: 'Unauthorized' });
    }

    await initDb();

    if (method === 'GET') {
      const date = query.date;
      if (!isValidBookingDate(date)) {
        return jsonResponse(res, 400, { error: 'A valid date query param is required' });
      }

      const result = await pool.query(
        'SELECT date, note FROM shop_closed_dates WHERE date = $1',
        [date]
      );
      const closure = result.rows[0];
      return jsonResponse(res, 200, { date, closed: Boolean(closure), note: closure?.note || '' });
    }

    if (method === 'POST') {
      let body;
      try {
        body = parseBody(req);
      } catch (error) {
        return jsonResponse(res, 400, { error: error.message });
      }

      const { date } = body;
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (!isValidBookingDate(date)) {
        return jsonResponse(res, 400, { error: 'A valid date is required' });
      }
      if (note.length > 250) {
        return jsonResponse(res, 400, { error: 'Closure note must be 250 characters or fewer' });
      }

      const result = await pool.query(
        `INSERT INTO shop_closed_dates (date, note)
         VALUES ($1, $2)
         ON CONFLICT (date) DO UPDATE SET note = EXCLUDED.note
         RETURNING date, note`,
        [date, note]
      );
      return jsonResponse(res, 200, { ...result.rows[0], closed: true });
    }

    if (method === 'DELETE') {
      const date = query.date;
      if (!isValidBookingDate(date)) {
        return jsonResponse(res, 400, { error: 'A valid date query param is required' });
      }

      await pool.query('DELETE FROM shop_closed_dates WHERE date = $1', [date]);
      return jsonResponse(res, 200, { date, closed: false, note: '' });
    }

    return jsonResponse(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return handleError(res, error);
  }
};