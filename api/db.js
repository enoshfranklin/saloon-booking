const { Pool } = require('pg');

const pool = global.__booking_pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

global.__booking_pool = pool;

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id text PRIMARY KEY,
      date text NOT NULL,
      time text NOT NULL,
      customer_name text NOT NULL,
      phone text,
      service text,
      created_at timestamptz DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS bookings_date_time_unique
    ON bookings (date, time);
  `);
}

module.exports = {
  pool,
  initDb,
};
