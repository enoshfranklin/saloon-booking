const bookingsList = document.getElementById('bookings-list');
const selectedDateLabel = document.getElementById('selected-date-label');
const todayButton = document.getElementById('today-button');
const adminTokenInput = document.getElementById('admin-token');
const bookingDate = document.getElementById('booking-date');
const adminLoadButton = document.getElementById('admin-load-button');
const adminStatus = document.getElementById('admin-status');
const editBookingCard = document.getElementById('edit-booking-card');
const editBookingForm = document.getElementById('edit-booking-form');
const editBookingId = document.getElementById('edit-booking-id');
const editBookingDate = document.getElementById('edit-booking-date');
const editBookingTime = document.getElementById('edit-booking-time');
const editCustomerName = document.getElementById('edit-customer-name');
const editCustomerPhone = document.getElementById('edit-customer-phone');
const editCustomerEmail = document.getElementById('edit-customer-email');
const editServiceType = document.getElementById('edit-service-type');
const cancelEditButton = document.getElementById('cancel-edit');

const API_ROOT = '/api/bookings';
const SALON_NAME = 'Salon Booking';

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeWhatsAppPhone(phone) {
  if (!phone) return '';

  const digits = phone
    .replace(/\s+/g, '')
    .replace(/[+()\-\[\]]/g, '')
    .replace(/[^\d]/g, '');

  if (!digits) return '';

  if (digits.startsWith('91') && digits.length > 10) {
    return digits;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

function buildCancellationMessage(booking) {
  const customerName = booking.customerName || 'Customer';
  const serviceName = booking.service || 'Service';
  const dateValue = booking.date ? formatDate(new Date(`${booking.date}T00:00:00`)) : 'Date';
  const timeValue = booking.time || 'Time';
  const message = [
    `Hi ${customerName},`,
    '',
    `Your booking at ${SALON_NAME} has been cancelled.`,
    '',
    'Booking details:',
    `Service: ${serviceName}`,
    `Date: ${dateValue}`,
    `Time: ${timeValue}`,
    '',
    'We apologize for the inconvenience. Please contact us if you would like to reschedule.',
    '',
    'Thank you,',
    SALON_NAME,
  ].join('\n');

  return encodeURIComponent(message);
}

function buildWhatsAppLink(booking) {
  const normalized = normalizeWhatsAppPhone(booking.phone);
  if (!normalized) {
    return null;
  }

  const message = buildCancellationMessage(booking);
  return `https://wa.me/${normalized}?text=${message}`;
}

let currentDate = null;

function getAdminToken() {
  return adminTokenInput.value.trim();
}

function displayAdminMessage(message, isError = false) {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.style.background = isError ? '#fee2e2' : '#fef3c7';
  adminStatus.style.color = isError ? '#991b1b' : '#92400e';
}

function parseJsonOrText(response) {
  return response.text().then((text) => {
    try {
      return JSON.parse(text);
    } catch (_) {
      return { error: text || 'Unexpected response from server' };
    }
  });
}

function getAdminHeaders() {
  const token = getAdminToken();
  return token ? { 'x-admin-secret': token } : {};
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
  editCustomerEmail.value = booking.email || '';
  editServiceType.value = booking.service || '';
  showEditForm();
}

async function fetchBookings(dateValue) {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Enter admin token to view bookings.');
  }

  const response = await fetch(`${API_ROOT}/admin?date=${encodeURIComponent(dateValue)}`, {
    headers: getAdminHeaders(),
  });

  if (!response.ok) {
    const payload = await parseJsonOrText(response);
    throw new Error(payload.error || 'Unable to load bookings');
  }

  return response.json();
}

async function deleteBooking(id) {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Enter admin token to cancel bookings.');
  }

  const response = await fetch(`${API_ROOT}/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    const payload = await parseJsonOrText(response);
    throw new Error(payload.error || 'Unable to delete booking');
  }
}

async function updateBooking(booking) {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Enter admin token to update bookings.');
  }

  const response = await fetch(`${API_ROOT}/${booking.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminHeaders(),
    },
    body: JSON.stringify(booking),
  });

  if (!response.ok) {
    const payload = await parseJsonOrText(response);
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
    const status = (booking.status || 'pending').toLowerCase();
    const whatsappLink = buildWhatsAppLink(booking);
    const isCancelled = status === 'cancelled';
    const editButton = isCancelled ? '' : `<button class="edit" data-id="${booking.id}">Edit</button>`;
    const cancelButton = isCancelled ? '' : `<button class="delete" data-id="${booking.id}">Cancel Booking</button>`;
    const whatsappButton = whatsappLink
      ? `<button class="whatsapp" data-id="${booking.id}">Notify on WhatsApp</button>`
      : '<p class="whatsapp-helper">Customer phone number is not available.</p>';

    card.className = 'booking-card';
    card.dataset.id = booking.id;
    card.dataset.date = booking.date;
    card.dataset.time = booking.time;
    card.dataset.customerName = booking.customerName || '';
    card.dataset.phone = booking.phone || '';
    card.dataset.email = booking.email || '';
    card.dataset.service = booking.service || '';
    card.dataset.status = status;
    card.innerHTML = `
      <div class="booking-meta">
        <div>
          <p><strong>${booking.time}</strong> · ${booking.customerName}</p>
          <p>${booking.service || 'No service selected'}</p>
          <p>${booking.phone || 'No phone provided'}</p>
        </div>
      </div>
      <div class="booking-status-row">
        <span class="status-badge ${isCancelled ? 'cancelled' : 'active'}">${isCancelled ? 'Cancelled' : 'Active'}</span>
      </div>
      <div class="booking-actions">
        ${editButton}
        ${cancelButton}
      </div>
      ${isCancelled ? `
        <div class="whatsapp-message-panel">
          ${whatsappButton}
          <p class="whatsapp-helper">WhatsApp message ready — press Send to notify the customer.</p>
        </div>
      ` : ''}
    `;
    bookingsList.appendChild(card);
  });
}

async function loadBookings(dateValue) {
  currentDate = dateValue;
  hideEditForm();
  selectedDateLabel.textContent = formatDate(new Date(dateValue));

  if (!getAdminToken()) {
    displayAdminMessage('Enter your admin token to view bookings.', true);
    bookingsList.innerHTML = '';
    return;
  }

  displayAdminMessage('Loading bookings...', false);

  try {
    const bookings = await fetchBookings(dateValue);
    displayAdminMessage('', false);
    renderBookings(bookings, dateValue);
  } catch (error) {
    displayAdminMessage(error.message, true);
    bookingsList.innerHTML = '';
  }
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
    const bookingCard = target.closest('.booking-card');
    const customerName = bookingCard?.dataset.customerName || 'this customer';
    const confirmed = window.confirm(`Cancel the booking for ${customerName}?`);
    if (!confirmed) return;

    try {
      await deleteBooking(bookingId);
      displayAdminMessage('Booking cancelled successfully.', false);
      await loadBookings(currentDate || new Date().toISOString().slice(0, 10));
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (target.classList.contains('whatsapp')) {
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

    const link = buildWhatsAppLink(booking);
    if (!link) {
      alert('Customer phone number is not available.');
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
    displayAdminMessage('WhatsApp message ready — press Send to notify the customer.', false);
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
      email: bookingCard.dataset.email,
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
    email: editCustomerEmail ? editCustomerEmail.value.trim() : '',
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

adminLoadButton.addEventListener('click', () => {
  const dateValue = bookingDate.value;
  if (!dateValue) {
    displayAdminMessage('Select a date first.', true);
    return;
  }
  loadBookings(dateValue);
});

todayButton.addEventListener('click', () => {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  loadBookings(today);
});

window.addEventListener('load', async () => {
  const today = new Date().toISOString().slice(0, 10);
  bookingDate.value = today;
  displayAdminMessage('Enter your admin token and click Load bookings.', false);
});
