const bookingForm = document.getElementById('booking-form');
const bookingDate = document.getElementById('booking-date');
const bookingTime = document.getElementById('booking-time');
const customerName = document.getElementById('customer-name');
const customerPhone = document.getElementById('customer-phone');
const serviceType = document.getElementById('service-type');
const bookingsList = document.getElementById('bookings-list');
const selectedDateLabel = document.getElementById('selected-date-label');
const todayButton = document.getElementById('today-button');
const cancelEditButton = document.getElementById('cancel-edit');
const saveButton = document.getElementById('save-button');

const STORAGE_KEY = 'saloon-bookings';
const START_TIME = 9;
const END_TIME = 18;
const STEP_MINUTES = 30;
let editBookingId = null;

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getIsoDate(value) {
  return new Date(value + 'T00:00:00').toISOString().slice(0, 10);
}

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function timeSlotsForDate(dateValue) {
  const slots = [];
  const [year, month, day] = dateValue.split('-').map(Number);
  for (let hour = START_TIME; hour <= END_TIME; hour++) {
    for (let minute = 0; minute < 60; minute += STEP_MINUTES) {
      if (hour === END_TIME && minute > 0) continue;
      const date = new Date(year, month - 1, day, hour, minute);
      const label = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      slots.push({ value: label, label });
    }
  }
  return slots;
}

function getBookedSlots(dateValue) {
  const bookings = getBookings();
  return bookings
    .filter((booking) => booking.date === dateValue)
    .map((booking) => booking.time);
}

function renderTimeOptions(dateValue) {
  bookingTime.innerHTML = '';
  const bookedSlots = getBookedSlots(dateValue);
  const slots = timeSlotsForDate(dateValue);

  slots.forEach((slot) => {
    const option = document.createElement('option');
    option.value = slot.value;
    option.textContent = slot.label;

    if (bookedSlots.includes(slot.value) && (!editBookingId || !isEditingSameSlot(slot.value))) {
      option.disabled = true;
      option.textContent += ' — Booked';
    }

    bookingTime.appendChild(option);
  });
}

function isEditingSameSlot(slotValue) {
  if (!editBookingId) return false;
  const bookings = getBookings();
  const current = bookings.find((booking) => booking.id === editBookingId);
  return current && current.time === slotValue;
}

function renderBookings(dateValue) {
  const bookings = getBookings().filter((booking) => booking.date === dateValue);
  selectedDateLabel.textContent = formatDate(new Date(dateValue));

  if (bookings.length === 0) {
    bookingsList.innerHTML = '<div class="no-bookings">No bookings yet. Save a new appointment for this date.</div>';
    return;
  }

  bookingsList.innerHTML = '';
  bookings.sort((a, b) => a.time.localeCompare(b.time));

  bookings.forEach((booking) => {
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
      <div class="booking-actions">
        <button class="edit" data-id="${booking.id}">Edit</button>
        <button class="delete" data-id="${booking.id}">Cancel</button>
      </div>
    `;

    bookingsList.appendChild(card);
  });
}

function resetForm() {
  bookingForm.reset();
  editBookingId = null;
  saveButton.textContent = 'Save Booking';
  cancelEditButton.classList.add('hidden');
  renderTimeOptions(bookingDate.value);
}

function setDateToToday() {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  renderTimeOptions(today);
  renderBookings(today);
}

bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const dateValue = bookingDate.value;
  const booking = {
    id: editBookingId || crypto.randomUUID(),
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

  const bookings = getBookings();
  const conflicting = bookings.some((existing) => {
    return existing.date === booking.date && existing.time === booking.time && existing.id !== booking.id;
  });

  if (conflicting) {
    alert('This timeslot is already booked. Please choose another one.');
    renderTimeOptions(dateValue);
    return;
  }

  if (editBookingId) {
    const index = bookings.findIndex((item) => item.id === editBookingId);
    if (index >= 0) bookings[index] = booking;
  } else {
    bookings.push(booking);
  }

  saveBookings(bookings);
  resetForm();
  renderBookings(dateValue);
});

cancelEditButton.addEventListener('click', () => {
  resetForm();
});

todayButton.addEventListener('click', () => {
  setDateToToday();
});

bookingsList.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const bookingId = target.dataset.id;
  const bookings = getBookings();

  if (target.classList.contains('delete')) {
    const updated = bookings.filter((booking) => booking.id !== bookingId);
    saveBookings(updated);
    renderTimeOptions(bookingDate.value);
    renderBookings(bookingDate.value);
    return;
  }

  if (target.classList.contains('edit')) {
    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking) return;

    editBookingId = booking.id;
    bookingDate.value = booking.date;
    renderTimeOptions(booking.date);
    bookingTime.value = booking.time;
    customerName.value = booking.customerName;
    customerPhone.value = booking.phone;
    serviceType.value = booking.service;
    saveButton.textContent = 'Update Booking';
    cancelEditButton.classList.remove('hidden');
    return;
  }
});

bookingDate.addEventListener('change', () => {
  const value = bookingDate.value;
  renderTimeOptions(value);
  renderBookings(value);
});

window.addEventListener('load', () => {
  setDateToToday();
});
