const { Pool } = require('pg');

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_DATABASE_URL ||
    process.env.POSTGRES_DATABASE ||
    null
  );
}

const connectionString = getConnectionString();
if (!connectionString) {
  throw new Error('Database connection string is not configured. Set DATABASE_URL or a Supabase Postgres URL env var.');
}

const sslEnabled =
  process.env.DATABASE_SSL === 'true' ||
  /sslmode=(require|no-verify)/i.test(process.env.PGSSLMODE || '') ||
  /sslmode=(require|no-verify)/i.test(connectionString) ||
  /ssl=true/i.test(connectionString);

if (sslEnabled) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const pool = global.__booking_pool || new Pool({
  connectionString,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
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
      email text,
      service text,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
      confirmation_email_sent_at timestamptz,
      cancellation_email_sent_at timestamptz,
      created_at timestamptz DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
  `);

  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS email text;
  `);

  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;
  `);

  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz;
  `);

  await pool.query(`
    UPDATE bookings
      SET status = 'pending'
      WHERE status IS NULL OR status NOT IN ('pending', 'confirmed', 'cancelled', 'completed');
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'bookings_date_time_unique'
      ) THEN
        EXECUTE 'DROP INDEX bookings_date_time_unique';
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS bookings_date_time_unique_active
    ON bookings (date, time)
    WHERE COALESCE(status, 'pending') IN ('pending', 'confirmed');
  `);
}

module.exports = {
  pool,
  initDb,
};
