'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidBookingDate,
  isBookingDateWithinWindow,
  isBookingDateTimeInPast,
} = require('../api/booking-time');

test('booking date validation rejects malformed and impossible dates', () => {
  assert.equal(isValidBookingDate('2026-10-02'), true);
  assert.equal(isValidBookingDate('2026-02-30'), false);
  assert.equal(isValidBookingDate('10/02/2026'), false);
});

test('booking date window allows up to seven calendar days ahead', () => {
  const now = new Date('2026-10-02T19:00:00.000Z');
  const timeZone = 'America/New_York';

  assert.equal(isBookingDateWithinWindow('2026-10-02', now, timeZone), true);
  assert.equal(isBookingDateWithinWindow('2026-10-09', now, timeZone), true);
  assert.equal(isBookingDateWithinWindow('2026-10-10', now, timeZone), false);
  assert.equal(isBookingDateWithinWindow('2026-10-01', now, timeZone), false);
});

test('booking time validation rejects past dates and elapsed times today', () => {
  const now = new Date('2026-10-02T19:00:00.000Z');
  const timeZone = 'America/New_York';

  assert.equal(isBookingDateTimeInPast('2026-10-01', 15 * 60 + 15, now, timeZone), true);
  assert.equal(isBookingDateTimeInPast('2026-10-02', 14 * 60 + 30, now, timeZone), true);
  assert.equal(isBookingDateTimeInPast('2026-10-02', 15 * 60 + 15, now, timeZone), false);
  assert.equal(isBookingDateTimeInPast('2026-10-03', 10 * 60 + 30, now, timeZone), false);
});