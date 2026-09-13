import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-booking-email-secret',
};

function getSalonName() {
  return Deno.env.get('SALON_NAME') || 'Salon Booking';
}

function getEmailFrom() {
  return Deno.env.get('EMAIL_FROM') || 'noreply@localhost';
}

function formatDisplayDate(dateValue: string | undefined) {
  if (!dateValue) return 'Date';
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function escapeHtml(value: string) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEmailHtml({
  customerName,
  serviceName,
  dateValue,
  timeValue,
  bookingId,
  status,
  type,
}: {
  customerName: string;
  serviceName: string;
  dateValue: string;
  timeValue: string;
  bookingId: string;
  status: string;
  type: 'confirmation' | 'cancellation';
}) {
  const salonName = getSalonName();
  const title = type === 'confirmation' ? 'Your booking has been confirmed' : 'Your salon booking has been cancelled';
  const intro = type === 'confirmation'
    ? 'Your booking has been confirmed.'
    : 'Your salon booking has been cancelled.';
  const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
  const salonAddress = Deno.env.get('SALON_ADDRESS') || '';
  const salonPhone = Deno.env.get('SALON_PHONE') || '';
  const salonEmail = Deno.env.get('SALON_EMAIL') || '';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin:0; background:#f5f5f5; font-family:Arial, sans-serif; color:#111827;">
        <div style="max-width:600px; margin:32px auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
          <div style="background:#111827; color:#ffffff; padding:24px 32px;">
            <div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#f3f4f6;">${escapeHtml(salonName)}</div>
            <h1 style="margin:10px 0 0; font-size:28px; line-height:1.3; color:#ffffff;">${title}</h1>
          </div>
          <div style="padding:32px 24px;">
            <p style="margin:0 0 18px; font-size:16px; line-height:1.6;">Hi ${escapeHtml(customerName)},</p>
            <p style="margin:0 0 18px; font-size:16px; line-height:1.6;">${intro}</p>
            <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px; margin:18px 0;">
              <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#6b7280; margin-bottom:10px;">Booking details</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="padding:6px 0; color:#6b7280; width:120px;">Service:</td>
                  <td style="padding:6px 0; font-weight:600;">${escapeHtml(serviceName || 'Service')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#6b7280;">Date:</td>
                  <td style="padding:6px 0; font-weight:600;">${escapeHtml(formatDisplayDate(dateValue))}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#6b7280;">Time:</td>
                  <td style="padding:6px 0; font-weight:600;">${escapeHtml(timeValue || 'Time')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#6b7280;">Booking ID:</td>
                  <td style="padding:6px 0; font-weight:600;">${escapeHtml(bookingId || 'N/A')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#6b7280;">Status:</td>
                  <td style="padding:6px 0; font-weight:600;">${escapeHtml(statusLabel)}</td>
                </tr>
              </table>
            </div>
            <p style="margin:0 0 18px; font-size:16px; line-height:1.6;">
              ${type === 'confirmation'
                ? 'We look forward to seeing you.'
                : 'If you would like to make another appointment, please contact us or create a new booking.'}
            </p>
            ${(salonAddress || salonPhone || salonEmail) ? `
              <div style="margin-top:18px; padding-top:18px; border-top:1px solid #e5e7eb; color:#4b5563; font-size:14px; line-height:1.6;">
                ${salonAddress ? `<div>${escapeHtml(salonAddress)}</div>` : ''}
                ${salonPhone ? `<div>${escapeHtml(salonPhone)}</div>` : ''}
                ${salonEmail ? `<div>${escapeHtml(salonEmail)}</div>` : ''}
              </div>
            ` : ''}
            <p style="margin:24px 0 0; font-size:16px; line-height:1.6;">Thank you,<br />${escapeHtml(salonName)}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const authHeader = req.headers.get('authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const functionSecret = Deno.env.get('BOOKING_EMAIL_SECRET');
  const incomingSecret = req.headers.get('x-booking-email-secret');

  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    if (!functionSecret || incomingSecret !== functionSecret) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const emailType = payload?.type;
  const booking = payload?.booking || {};
  if (!['confirmation', 'cancellation'].includes(emailType)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid email type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!booking?.id) {
    return new Response(JSON.stringify({ ok: false, error: 'Booking id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const toEmail = typeof booking.email === 'string' ? booking.email.trim() : '';
  if (!toEmail) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No customer email available' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Supabase configuration missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingBooking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, date, time, customer_name, email, service, status, confirmation_email_sent_at, cancellation_email_sent_at')
    .eq('id', booking.id)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to load booking for email send:', fetchError);
    return new Response(JSON.stringify({ ok: false, error: 'Unable to load booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const savedBooking = existingBooking || booking;
  const finalEmail = (savedBooking.email || booking.email || toEmail).trim();
  const finalStatus = savedBooking.status || booking.status || 'pending';
  const finalCustomerName = savedBooking.customer_name || booking.customerName || 'Customer';
  const finalService = savedBooking.service || booking.service || 'Service';
  const finalDate = savedBooking.date || booking.date || 'Date';
  const finalTime = savedBooking.time || booking.time || 'Time';
  const finalId = savedBooking.id || booking.id;

  if (emailType === 'confirmation' && savedBooking.confirmation_email_sent_at) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Confirmation email already sent' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (emailType === 'cancellation' && savedBooking.cancellation_email_sent_at) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Cancellation email already sent' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (emailType === 'cancellation' && finalStatus !== 'cancelled') {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Booking not in cancelled state' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Resend API key missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const emailFrom = Deno.env.get('EMAIL_FROM');
  if (!emailFrom) {
    return new Response(JSON.stringify({ ok: false, error: 'EMAIL_FROM is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const subject = emailType === 'confirmation'
    ? `${getSalonName()}: Booking confirmed for ${finalCustomerName}`
    : `${getSalonName()}: Booking cancelled for ${finalCustomerName}`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [finalEmail],
      subject,
      html: buildEmailHtml({
        customerName: finalCustomerName,
        serviceName: finalService,
        dateValue: finalDate,
        timeValue: finalTime,
        bookingId: finalId,
        status: finalStatus,
        type: emailType,
      }),
    }),
  });

  if (!resendResponse.ok) {
    const resendText = await resendResponse.text();
    console.error('Resend API error:', resendText);
    return new Response(JSON.stringify({ ok: false, error: 'Email delivery failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const trackingField = emailType === 'confirmation' ? 'confirmation_email_sent_at' : 'cancellation_email_sent_at';
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ [trackingField]: new Date().toISOString() })
    .eq('id', finalId);

  if (updateError) {
    console.error('Failed to update email tracking timestamp:', updateError);
  }

  return new Response(JSON.stringify({ ok: true, sent: true, type: emailType, bookingId: finalId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
