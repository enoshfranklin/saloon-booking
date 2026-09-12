const bookingForm = document.getElementById('booking-form');
const bookingDate = document.getElementById('booking-date');
const bookingTime = document.getElementById('booking-time');
const bookingTimePicker = document.getElementById('booking-time-picker');
const customerName = document.getElementById('customer-name');
const customerPhone = document.getElementById('customer-phone');
const serviceType = document.getElementById('service-type');
const bookingsList = document.getElementById('bookings-list');
const selectedDateLabel = document.getElementById('selected-date-label');
const statusMessage = document.getElementById('status-message');
const todayButton = document.getElementById('today-button');
const saveButton = document.getElementById('save-button');

const API_ROOT = '/api/bookings';
const SLOT_LENGTH_MINUTES = 45;
// Allowed slot definitions (minutes since midnight)
const ALLOWED_SLOT_MINUTES = [
  10 * 60 + 30,
  11 * 60 + 15,
  12 * 60 + 0,
  12 * 60 + 45,
  14 * 60 + 30,
  15 * 60 + 15,
  16 * 60 + 0,
  16 * 60 + 45,
  17 * 60 + 30,
  18 * 60 + 15,
  19 * 60 + 0,
];
let bookingsCache = [];

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12) + 1;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function timeSlotsForDate(dateValue) {
  // Generate slots exactly as defined in ALLOWED_SLOT_MINUTES for the given date
  const slots = [];
  const [year, month, day] = dateValue.split('-').map(Number);

  ALLOWED_SLOT_MINUTES.forEach((minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const dt = new Date(year, month - 1, day, hours, mins);
    const label = formatTimeLabel(dt);
    slots.push({ value: label, label, minutes });
  });

  // Ensure chronological order
  slots.sort((a, b) => a.minutes - b.minutes);
  return slots;
}

function getBookedSlots() {
  return bookingsCache.map((booking) => booking.time);
}

function selectBookingTime(value) {
  bookingTime.value = value;

  if (!bookingTimePicker) {
    return;
  }

  const allButtons = bookingTimePicker.querySelectorAll('.time-slot-button');
  allButtons.forEach((button) => {
    const isSelected = button.dataset.time === value;
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function renderTimeOptions(dateValue) {
  if (!bookingTimePicker) {
    return;
  }

  bookingTimePicker.innerHTML = '';
  bookingTime.value = '';

  const bookedSlots = getBookedSlots();
  const slots = timeSlotsForDate(dateValue);
  const availableSlots = slots.filter((slot) => !bookedSlots.includes(slot.value));

  // Single, chronological presentation — no Morning/Afternoon/Evening headings
  const header = document.createElement('div');
  header.className = 'time-group-header';
  header.textContent = 'Available Times';
  bookingTimePicker.appendChild(header);

  let grid = document.createElement('div');
  grid.className = 'time-grid';

  // Render slots; insert a subtle spacer where the lunch break exists (between 12:45 and 14:30)
  availableSlots.forEach((slot, idx) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-slot-button';
    button.dataset.time = slot.value;
    button.textContent = slot.label;
    button.addEventListener('click', () => selectBookingTime(slot.value));
    grid.appendChild(button);

    // After the 12:45 slot, insert a break spacer
    const isLunchEnd = slot.minutes === 12 * 60 + 45;
    if (isLunchEnd) {
      bookingTimePicker.appendChild(grid);
      const spacer = document.createElement('div');
      spacer.className = 'time-break';
      spacer.innerHTML = `<span></span><small></small>`;
      bookingTimePicker.appendChild(spacer);
      // create a new grid for afternoon slots
      grid = document.createElement('div');
      grid.className = 'time-grid';
    }
  });

  // Append the final grid (if it hasn't been appended yet)
  if (!bookingTimePicker.contains(grid)) {
    bookingTimePicker.appendChild(grid);
  }

  if (availableSlots.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'time-empty';
    emptyState.textContent = 'No appointments available for this date.';
    bookingTimePicker.appendChild(emptyState);
  }
}

function renderBookings(dateValue) {
  if (selectedDateLabel) {
    selectedDateLabel.textContent = formatDate(new Date(dateValue));
  }

  if (!bookingsList) {
    return;
  }

  if (bookingsCache.length === 0) {
    bookingsList.innerHTML = '<div class="no-bookings">No appointments available for this date.</div>';
    return;
  }

  bookingsList.innerHTML = '';
}

function resetForm() {
  bookingForm.reset();
  bookingTime.value = '';
  if (bookingTimePicker) {
    renderTimeOptions(bookingDate.value);
  }
}

async function parseJsonOrText(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    return { error: text || 'Unexpected response from server' };
  }
}

async function fetchBookings(dateValue) {
  const response = await fetch(`${API_ROOT}?date=${encodeURIComponent(dateValue)}`);
  if (!response.ok) {
    const payload = await parseJsonOrText(response);
    throw new Error(payload.error || 'Unable to load bookings');
  }
  return response.json();
}

async function createBooking(booking) {
  const response = await fetch(API_ROOT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (!response.ok) {
    const payload = await parseJsonOrText(response);
    throw new Error(payload.error || 'Unable to create booking');
  }
  return response.json();
}

function showStatus(message) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
}

function clearStatus() {
  if (!statusMessage) return;
  statusMessage.textContent = '';
}

async function loadBookings(dateValue) {
  bookingTime.innerHTML = '';
  showStatus('Loading available slots...');

  try {
    bookingsCache = await fetchBookings(dateValue);
    clearStatus();
  } catch (error) {
    console.warn('Unable to load bookings for', dateValue, error);
    bookingsCache = [];
    showStatus('Unable to load available times right now. Please try another date.');
  }

  renderTimeOptions(dateValue);
  renderBookings(dateValue);
}

function conflictExists(booking) {
  return bookingsCache.some((existing) => existing.date === booking.date && existing.time === booking.time);
}

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const dateValue = bookingDate.value;
  const booking = {
    date: dateValue,
    time: bookingTime.value,
    customerName: customerName.value.trim(),
    phone: customerPhone.value.trim(),
    service: serviceType.value,
  };

  if (!booking.customerName) {
    alert('Please add a customer name.');
    return;
  }

  if (!booking.time) {
    alert('Please choose an available time slot.');
    return;
  }

  await loadBookings(dateValue);

  if (conflictExists(booking)) {
    alert('Sorry, this time slot was just booked. Please choose another time.');
    await loadBookings(dateValue);
    return;
  }

  try {
    await createBooking(booking);
    resetForm();
    window.location.href = 'booking-success.html';
  } catch (error) {
    if (error.message === 'Timeslot already booked' || error.message.includes('already booked')) {
      alert('Sorry, this time slot was just booked. Please choose another time.');
      await loadBookings(dateValue);
      return;
    }

    alert(error.message || 'Unable to save your booking. Please try again.');
  }
});

if (todayButton) {
  todayButton.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    bookingDate.value = today;
    loadBookings(today);
  });
}

bookingDate.addEventListener('change', async () => {
  const value = bookingDate.value;
  if (value) {
    await loadBookings(value);
  }
});

window.addEventListener('load', async () => {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  await loadBookings(today);
});
