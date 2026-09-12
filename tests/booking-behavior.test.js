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

test('booking success redirects after a successful save', () => {
  const script = read('script.js');
  assert.match(script, /booking-success\.html|window\.location\.|redirect/i);
});

test('public bookings API strips customer details', () => {
  const api = read('api/bookings/index.js');
  assert.match(api, /SELECT id, date, time FROM bookings/i);
  assert.doesNotMatch(api, /customer_name AS "customerName"|phone|service/i);
});
