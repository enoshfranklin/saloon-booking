const bookingsList = document.getElementById('bookings-list');
const selectedDateLabel = document.getElementById('selected-date-label');
const todayButton = document.getElementById('today-button');
const adminTokenInput = document.getElementById('admin-token');

const API_ROOT = '/api/bookings';

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAdminToken() {
  return adminTokenInput.value.trim();
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
  const bookings = await fetchBookings(dateValue);
  renderBookings(bookings, dateValue);
}

document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const bookingId = target.dataset.id;
  if (!bookingId) return;

  if (target.classList.contains('delete')) {
    try {
      await deleteBooking(bookingId);
      await loadBookings(new Date().toISOString().slice(0, 10));
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (target.classList.contains('edit')) {
    alert('Edit booking from the database directly or extend this admin view to include a full edit form.');
  }
});

todayButton.addEventListener('click', () => {
  const today = new Date().toISOString().slice(0, 10);
  loadBookings(today);
});

window.addEventListener('load', async () => {
  const today = new Date().toISOString().slice(0, 10);
  await loadBookings(today);
});
