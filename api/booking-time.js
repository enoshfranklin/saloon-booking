function isValidBookingDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isBookingDateWithinWindow(
  date,
  now = new Date(),
  timeZone = process.env.BOOKING_TIME_ZONE || 'UTC'
) {
  if (!isValidBookingDate(date)) return false;

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const currentDate = `${values.year}-${values.month}-${values.day}`;
    const latestDate = new Date(`${currentDate}T00:00:00.000Z`);
    latestDate.setUTCDate(latestDate.getUTCDate() + 7);
    return date >= currentDate && date <= latestDate.toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

function isBookingDateTimeInPast(
  date,
  minutes,
  now = new Date(),
  timeZone = process.env.BOOKING_TIME_ZONE || 'UTC'
) {
  if (!isValidBookingDate(date) || !Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) {
    return true;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const currentDate = `${values.year}-${values.month}-${values.day}`;
    const currentMinutes = Number(values.hour) * 60 + Number(values.minute);
    return date < currentDate || (date === currentDate && minutes <= currentMinutes);
  } catch {
    return true;
  }
}

module.exports = { isValidBookingDate, isBookingDateWithinWindow, isBookingDateTimeInPast };