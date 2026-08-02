const bookingsList = document.getElementById('bookings-list');
const selectedDateLabel = document.getElementById('selected-date-label');
const todayButton = document.getElementById('today-button');
const adminTokenInput = document.getElementById('admin-token');
const bookingDate = document.getElementById('booking-date');
const editBookingCard = document.getElementById('edit-booking-card');
const editBookingForm = document.getElementById('edit-booking-form');
const editBookingId = document.getElementById('edit-booking-id');
const editBookingDate = document.getElementById('edit-booking-date');
const editBookingTime = document.getElementById('edit-booking-time');
const editCustomerName = document.getElementById('edit-customer-name');
const editCustomerPhone = document.getElementById('edit-customer-phone');
const editServiceType = document.getElementById('edit-service-type');
const cancelEditButton = document.getElementById('cancel-edit');

const API_ROOT = '/api/bookings';

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

let currentDate = null;

function getAdminToken() {
  return adminTokenInput.value.trim();
}

function showEditForm() {
  editBookingCard.classList.remove('hidden');
}

function hideEditForm() {
  editBookingCard.classList.add('hidden');
  editBookingForm.reset();
}

function fillEditForm(booking) {
  editBookingId.value = booking.id;
  editBookingDate.value = booking.date;
  editBookingTime.value = booking.time;
  editCustomerName.value = booking.customerName;
  editCustomerPhone.value = booking.phone || '';
  editServiceType.value = booking.service || '';
  showEditForm();
}

async function fetchBookings(dateValue) {
  const response = await fetch(`${API_ROOT}?date=${encodeURIComponent(dateValue)}`);
  if (!response.ok) {
    throw new Error('Unable to load bookings');
  }
  return response.json();
}

async function deleteBooking(id) {
  const token = getAdminToken();
  const response = await fetch(`${API_ROOT}/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': token },
  });

  if (!response.ok && response.status !== 204) {
    const payload = await response.json();
    throw new Error(payload.error || 'Unable to delete booking');
  }
}

async function updateBooking(booking) {
  const token = getAdminToken();
  const response = await fetch(`${API_ROOT}/${booking.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': token,
    },
    body: JSON.stringify(booking),
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.error || 'Unable to update booking');
  }
  return response.json();
}

function renderBookings(bookings, dateValue) {
  selectedDateLabel.textContent = formatDate(new Date(dateValue));

  if (bookings.length === 0) {
    bookingsList.innerHTML = '<div class="no-bookings">No bookings found for this date.</div>';
    return;
  }

  bookingsList.innerHTML = '';
  bookings.sort((a, b) => a.time.localeCompare(b.time));

  bookings.forEach((booking) => {
    const card = document.createElement('article');
    card.className = 'booking-card';
    card.dataset.id = booking.id;
    card.dataset.date = booking.date;
    card.dataset.time = booking.time;
    card.dataset.customerName = booking.customerName || '';
    card.dataset.phone = booking.phone || '';
    card.dataset.service = booking.service || '';
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

async function loadBookings(dateValue) {
  currentDate = dateValue;
  const bookings = await fetchBookings(dateValue);
  hideEditForm();
  renderBookings(bookings, dateValue);
}

bookingDate.addEventListener('change', async () => {
  const value = bookingDate.value;
  if (value) {
    await loadBookings(value);
  }
});

document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const bookingId = target.dataset.id;
  if (!bookingId) return;

  if (target.classList.contains('delete')) {
    try {
      await deleteBooking(bookingId);
      await loadBookings(currentDate || new Date().toISOString().slice(0, 10));
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (target.classList.contains('edit')) {
    const bookingCard = target.closest('.booking-card');
    if (!bookingCard) return;
    const booking = {
      id: bookingId,
      date: bookingCard.dataset.date,
      time: bookingCard.dataset.time,
      customerName: bookingCard.dataset.customerName,
      phone: bookingCard.dataset.phone,
      service: bookingCard.dataset.service,
    };
    fillEditForm(booking);
  }
});

cancelEditButton.addEventListener('click', () => {
  hideEditForm();
});

editBookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const booking = {
    id: editBookingId.value,
    date: editBookingDate.value,
    time: editBookingTime.value,
    customerName: editCustomerName.value.trim(),
    phone: editCustomerPhone.value.trim(),
    service: editServiceType.value,
  };

  if (!booking.customerName) {
    alert('Customer name is required.');
    return;
  }

  try {
    await updateBooking(booking);
    hideEditForm();
    await loadBookings(booking.date);
    bookingDate.value = booking.date;
  } catch (error) {
    alert(error.message);
  }
});

todayButton.addEventListener('click', () => {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  loadBookings(today);
});

window.addEventListener('load', async () => {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  await loadBookings(today);
});
