function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
}

function getBookingEmailSecret() {
  return process.env.BOOKING_EMAIL_SECRET || '';
}

async function callSupabaseBookingEmail({ type, booking }) {
  if (!type || !['confirmation', 'cancellation'].includes(type)) {
    return { ok: true, skipped: true, reason: 'Unsupported email type' };
  }

  if (!booking || !booking.id) {
    return { ok: true, skipped: true, reason: 'Booking missing id' };
  }

  const emailAddress = typeof booking.email === 'string' ? booking.email.trim() : '';
  if (!emailAddress) {
    return { ok: true, skipped: true, reason: 'No customer email available' };
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Email notification skipped: Supabase URL or service role key is not configured.');
    return { ok: true, skipped: true, reason: 'Supabase email configuration missing' };
  }

  const bookingSecret = getBookingEmailSecret();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  if (bookingSecret) {
    headers['x-booking-email-secret'] = bookingSecret;
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-booking-email`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type,
      booking: {
        ...booking,
        email: emailAddress,
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(payload || `Email notification request failed (${response.status})`);
  }

  return response.json().catch(() => ({ ok: true }));
}

module.exports = {
  callSupabaseBookingEmail,
};
