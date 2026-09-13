'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('public booking page hides cancellation controls', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /id="cancel-card"|id="cancel-button"|id="cancel-code"/i);
});

test('public booking page removes stray Red Room branding', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /Red Room|RedRoom|red room/i);
});

test('public booking experience follows the four-step flow structure', () => {
  const html = read('index.html');
  assert.match(html, /Service/i);
  assert.match(html, /Date & Time/i);
  assert.match(html, /Details/i);
  assert.match(html, /Confirm/i);
  assert.match(html, /Next: Select Date & Time/i);
});

test('public booking times compare booking minutes instead of raw labels', () => {
  const script = read('script.js');
  assert.match(script, /parseTimeToMinutes|getBookedSlotMinutes|slot\.minutes/i);
});

test('booking success redirects after a successful save', () => {
  const script = read('script.js');
  assert.match(script, /booking-success\.html|window\.location\.|redirect/i);
});

test('public bookings API strips customer details', () => {
  const api = read('api/bookings/index.js');
  assert.match(api, /SELECT id, date, time FROM bookings/i);
  assert.doesNotMatch(api, /customer_name AS "customerName"|phone|service/i);
});

test('booking API stores optional customer email and triggers confirmation email flow', () => {
  const api = read('api/bookings/index.js');
  assert.match(api, /email/i);
  assert.match(api, /confirmation|sendBookingEmail/i);
});

test('database init includes email tracking columns for booking notifications', () => {
  const db = read('api/db.js');
  assert.match(db, /email text|confirmation_email_sent_at|cancellation_email_sent_at/i);
});

test('edge function exists for Resend-based booking notifications', () => {
  const fn = read('supabase/functions/send-booking-email/index.ts');
  assert.match(fn, /RESEND_API_KEY|EMAIL_FROM|Resend|confirmation|cancellation/i);
});
