const bookingForm = document.getElementById('booking-form');
const bookingDate = document.getElementById('booking-date');
const bookingTime = document.getElementById('booking-time');
const bookingTimePicker = document.getElementById('booking-time-picker');
const customerName = document.getElementById('customer-name');
const customerPhone = document.getElementById('customer-phone');
const customerEmail = document.getElementById('customer-email');
const serviceType = document.getElementById('service-type');
const bookingsList = document.getElementById('bookings-list');
const selectedDateLabel = document.getElementById('selected-date-label');
const statusMessage = document.getElementById('status-message');
const todayButton = document.getElementById('today-button');
const saveButton = document.getElementById('save-button');
const progressItems = Array.from(document.querySelectorAll('.progress-item'));
const stepPanels = Array.from(document.querySelectorAll('.booking-step'));
const serviceCards = Array.from(document.querySelectorAll('.service-card'));
const summaryService = document.getElementById('summary-service');
const summaryDate = document.getElementById('summary-date');
const summaryTime = document.getElementById('summary-time');
const summaryCustomer = document.getElementById('summary-customer');
const summaryPhone = document.getElementById('summary-phone');
const summaryEmail = document.getElementById('summary-email');
let activeStep = 1;

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

function updateProgress() {
  progressItems.forEach((item) => {
    const stepIndex = Number(item.dataset.progress);
    item.classList.toggle('active', stepIndex === activeStep);
    item.classList.toggle('complete', stepIndex < activeStep);
  });

  stepPanels.forEach((panel) => {
    const isActive = Number(panel.dataset.step) === activeStep;
    panel.classList.toggle('active', isActive);
  });
}

function syncSummary() {
  if (!summaryService || !summaryDate || !summaryTime || !summaryCustomer || !summaryPhone || !summaryEmail) {
    return;
  }

  summaryService.textContent = serviceType.value || '—';
  summaryDate.textContent = bookingDate.value ? formatDate(new Date(`${bookingDate.value}T00:00:00`)) : '—';
  summaryTime.textContent = bookingTime.value || '—';
  summaryCustomer.textContent = customerName.value.trim() || '—';
  summaryPhone.textContent = customerPhone.value.trim() || '—';
  summaryEmail.textContent = customerEmail.value.trim() || '—';
}

function updateServiceSelection(value) {
  serviceType.value = value;
  serviceCards.forEach((card) => {
    const isSelected = card.dataset.serviceValue === value;
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-pressed', String(isSelected));
  });
  syncSummary();
}

function goToStep(step) {
  if (step < 1 || step > stepPanels.length) {
    return;
  }

  activeStep = step;
  updateProgress();
}

function formatTimeLabel(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12) + 1;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/\u00A0|\u202F/g, ' ');
  const amPmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2]);
    const ampm = amPmMatch[3].toUpperCase();

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return hour * 60 + minute;
  }

  const plainMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (plainMatch) {
    const hour = Number(plainMatch[1]);
    const minute = Number(plainMatch[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return hour * 60 + minute;
  }

  return null;
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

function getBookedSlotMinutes() {
  return bookingsCache
    .map((booking) => parseTimeToMinutes(booking.time))
    .filter((minutes) => minutes !== null);
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

  const bookedSlotMinutes = getBookedSlotMinutes();
  const slots = timeSlotsForDate(dateValue);
  const availableSlots = slots.filter((slot) => !bookedSlotMinutes.includes(slot.minutes));

  const header = document.createElement('div');
  header.className = 'time-group-header';
  header.textContent = 'Available Times';
  bookingTimePicker.appendChild(header);

  let grid = document.createElement('div');
  grid.className = 'time-grid';

  availableSlots.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-slot-button';
    button.dataset.time = slot.value;
    button.textContent = slot.label;
    button.addEventListener('click', () => {
      selectBookingTime(slot.value);
      syncSummary();
    });
    grid.appendChild(button);

    const isLunchEnd = slot.minutes === 12 * 60 + 45;
    if (isLunchEnd) {
      bookingTimePicker.appendChild(grid);
      const spacer = document.createElement('div');
      spacer.className = 'time-break';
      spacer.innerHTML = '<span>Lunch break</span><small>2:30 PM onward</small>';
      bookingTimePicker.appendChild(spacer);
      grid = document.createElement('div');
      grid.className = 'time-grid';
    }
  });

  if (!bookingTimePicker.contains(grid)) {
    bookingTimePicker.appendChild(grid);
  }

  if (availableSlots.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'time-empty';
    emptyState.textContent = 'No appointments available for this date.';
    bookingTimePicker.appendChild(emptyState);
  }

  syncSummary();
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
  serviceType.value = '';
  updateServiceSelection('');
  syncSummary();
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
    email: customerEmail ? customerEmail.value.trim() : '',
    service: serviceType.value,
  };

  if (!booking.customerName) {
    alert('Please add a customer name.');
    goToStep(3);
    return;
  }

  if (!booking.time) {
    alert('Please choose an available time slot.');
    goToStep(2);
    return;
  }

  if (!booking.service) {
    alert('Please select a service.');
    goToStep(1);
    return;
  }

  await loadBookings(dateValue);

  if (conflictExists(booking)) {
    alert('Sorry, this time slot was just booked. Please choose another time.');
    await loadBookings(dateValue);
    goToStep(2);
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
      goToStep(2);
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
    syncSummary();
  });
}

bookingDate.addEventListener('change', async () => {
  const value = bookingDate.value;
  if (value) {
    await loadBookings(value);
    syncSummary();
  }
});

serviceCards.forEach((card) => {
  card.addEventListener('click', () => {
    updateServiceSelection(card.dataset.serviceValue);
  });
});

const serviceNext = document.querySelector('.service-next');
if (serviceNext) {
  serviceNext.addEventListener('click', () => {
    if (!serviceType.value) {
      alert('Please select a service to continue.');
      return;
    }
    goToStep(2);
  });
}

const dateNext = document.querySelector('.date-next');
if (dateNext) {
  dateNext.addEventListener('click', () => {
    if (!bookingDate.value) {
      alert('Please choose a date.');
      return;
    }
    if (!bookingTime.value) {
      alert('Please choose an available time.');
      return;
    }
    goToStep(3);
  });
}

const detailsNext = document.querySelector('.details-next');
if (detailsNext) {
  detailsNext.addEventListener('click', () => {
    if (!customerName.value.trim()) {
      alert('Please add a customer name.');
      return;
    }
    syncSummary();
    goToStep(4);
  });
}

document.querySelectorAll('.back-step').forEach((button) => {
  button.addEventListener('click', () => {
    goToStep(Math.max(1, activeStep - 1));
  });
});

['customer-name', 'customer-phone', 'customer-email'].forEach((fieldId) => {
  const field = document.getElementById(fieldId);
  if (field) {
    field.addEventListener('input', syncSummary);
  }
});

window.addEventListener('load', async () => {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  updateServiceSelection(serviceType.value);
  syncSummary();
  updateProgress();
  await loadBookings(today);
});
