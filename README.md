# Saloon Booking

## Required Vercel Environment Variables

Set these values in Vercel for the project:

- `DATABASE_URL`
  - Your PostgreSQL connection string.
  - Example: `postgres://username:password@hostname:5432/database_name`
  - If you use Vercel Postgres, copy the provided database URL from the Vercel dashboard.

- `ADMIN_SECRET`
  - A strong secret token used to authorize admin edits and cancellations.
  - Example: `u6N8$4hYjK2pL9sQ`
  - Keep this value private and do not share it publicly.

Optional:

- `DATABASE_SSL`
  - Set to `true` if your database provider requires SSL/TLS.
  - Example: `true`

## How the app uses these variables

- The serverless API in `api/bookings/[id].js` checks `ADMIN_SECRET` before allowing `PUT` and `DELETE`.
- The API in `api/bookings.js` connects to the database using `DATABASE_URL`.
- `DATABASE_SSL=true` makes the database client use SSL when connecting.

## Deployment notes

- Deploy the repo root to Vercel.
- Public booking page: `https://<your-site>.vercel.app/`
- Admin page: `https://<your-site>.vercel.app/admin.html`

## Example Vercel env add commands

If you prefer Vercel CLI:

```bash
vercel env add DATABASE_URL production
vercel env add ADMIN_SECRET production
vercel env add DATABASE_SSL production
```

Then enter your actual values when prompted.
