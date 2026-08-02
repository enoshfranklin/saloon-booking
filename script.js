const bookingForm = document.getElementById('booking-form');
const bookingDate = document.getElementById('booking-date');
const bookingTime = document.getElementById('booking-time');
const customerName = document.getElementById('customer-name');
const customerPhone = document.getElementById('customer-phone');
const serviceType = document.getElementById('service-type');
const bookingsList = document.getElementById('bookings-list');
const selectedDateLabel = document.getElementById('selected-date-label');
const statusMessage = document.getElementById('status-message');
const todayButton = document.getElementById('today-button');
const saveButton = document.getElementById('save-button');

const API_ROOT = '/api/bookings';
const START_HOUR = 10;
const START_MINUTE = 30;
const END_HOUR = 17;
const END_MINUTE = 30;
const SLOT_LENGTH_MINUTES = 45;
let bookingsCache = [];

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeSlotsForDate(dateValue) {
  const slots = [];
  const [year, month, day] = dateValue.split('-').map(Number);
  const start = new Date(year, month - 1, day, START_HOUR, START_MINUTE);
  const end = new Date(year, month - 1, day, END_HOUR, END_MINUTE);
  let current = new Date(start);

  while (current <= end) {
    const label = current.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    slots.push({ value: label, label });
    current = new Date(current.getTime() + SLOT_LENGTH_MINUTES * 60000);
  }

  return slots;
}

function getBookedSlots() {
  return bookingsCache.map((booking) => booking.time);
}

function renderTimeOptions(dateValue) {
  bookingTime.innerHTML = '';
  const bookedSlots = getBookedSlots();
  const slots = timeSlotsForDate(dateValue);

  slots.forEach((slot) => {
    const option = document.createElement('option');
    option.value = slot.value;
    option.textContent = slot.label;

    if (bookedSlots.includes(slot.value)) {
      option.disabled = true;
      option.textContent += ' — Booked';
    }

    bookingTime.appendChild(option);
  });
}

function renderBookings(dateValue) {
  selectedDateLabel.textContent = formatDate(new Date(dateValue));

  if (bookingsCache.length === 0) {
    bookingsList.innerHTML = '<div class="no-bookings">No bookings yet. Save a new appointment for this date.</div>';
    return;
  }

  bookingsList.innerHTML = '';
  const sorted = [...bookingsCache].sort((a, b) => a.time.localeCompare(b.time));

  sorted.forEach((booking) => {
    const card = document.createElement('article');
    card.className = 'booking-card';
    card.innerHTML = `
      <div class="booking-meta">
        <div>
          <p><strong>${booking.time}</strong> · ${booking.customerName}</p>
          <p>${booking.service || 'No service selected'}</p>
          <p>${booking.phone || 'No phone provided'}</p>
        </div>
      </div>
    `;

    bookingsList.appendChild(card);
  });
}

function resetForm() {
  bookingForm.reset();
  renderTimeOptions(bookingDate.value);
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
  renderTimeOptions(dateValue);
  showStatus('Loading bookings...');

  try {
    bookingsCache = await fetchBookings(dateValue);
    clearStatus();
  } catch (error) {
    console.warn('Unable to load bookings for', dateValue, error);
    bookingsCache = [];
    showStatus('Unable to load bookings from the server. Check your API or database connection.');
  }

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

  if (conflictExists(booking)) {
    alert('This timeslot is already booked. Please choose another one.');
    renderTimeOptions(dateValue);
    return;
  }

  try {
    await createBooking(booking);
    await loadBookings(dateValue);
    resetForm();
  } catch (error) {
    alert(error.message);
  }
});

todayButton.addEventListener('click', () => {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  loadBookings(today);
});

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
