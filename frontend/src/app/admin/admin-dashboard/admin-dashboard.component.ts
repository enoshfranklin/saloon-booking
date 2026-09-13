import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminBooking, UpdateBookingPayload } from '../../core/services/admin.service';
import { WebBackgroundComponent } from '../../shared/web-background/web-background.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, WebBackgroundComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  // ─── State ──────────────────────────────────────────────────────────────
  adminToken = signal('');
  selectedDate = signal(new Date().toISOString().slice(0, 10));
  bookings = signal<AdminBooking[]>([]);
  statusMessage = signal('Enter your admin token and click Load bookings.');
  statusIsError = signal(false);
  isLoading = signal(false);

  editingBooking = signal<AdminBooking | null>(null);
  editForm = {
    date: '',
    time: '',
    customerName: '',
    phone: '',
    email: '',
    service: '',
  };

  readonly serviceOptions = [
    { value: '', label: 'None' },
    { value: 'Haircut', label: 'Haircut' },
    { value: 'Beard', label: 'Beard' },
    { value: 'Haircut + Beard', label: 'Haircut + Beard' },
    { value: 'Color', label: 'Color' },
    { value: 'Style', label: 'Style' },
  ];

  ngOnInit(): void {
    // Pre-set today's date
  }

  // ─── Token & Date ─────────────────────────────────────────────────────────
  onTokenChange(token: string): void {
    this.adminToken.set(token);
    this.adminService.setToken(token);
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
  }

  onTodayClick(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.selectedDate.set(today);
    this.loadBookings(today);
  }

  // ─── Load Bookings ───────────────────────────────────────────────────────
  onLoadClick(): void {
    const date = this.selectedDate();
    if (!date) {
      this.setStatus('Select a date first.', true);
      return;
    }
    this.adminService.setToken(this.adminToken());
    this.loadBookings(date);
  }

  private loadBookings(date: string): void {
    this.hideEditForm();
    this.setStatus('Loading bookings...', false);
    this.isLoading.set(true);

    this.adminService.fetchAdminBookings(date).subscribe({
      next: (data) => {
        this.bookings.set(data.sort((a, b) => a.time.localeCompare(b.time)));
        this.setStatus('', false);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.setStatus(err.message || 'Unable to load bookings.', true);
        this.bookings.set([]);
        this.isLoading.set(false);
      },
    });
  }

  // ─── Cancel Booking ───────────────────────────────────────────────────────
  onCancelBooking(booking: AdminBooking): void {
    if (!confirm(`Cancel the booking for ${booking.customerName}?`)) return;

    this.adminService.deleteBooking(booking.id).subscribe({
      next: () => {
        this.setStatus('Booking cancelled successfully.', false);
        this.loadBookings(this.selectedDate());
      },
      error: (err: Error) => {
        alert(err.message || 'Unable to cancel booking.');
      },
    });
  }

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  onWhatsApp(booking: AdminBooking): void {
    const link = this.adminService.buildWhatsAppLink(booking);
    if (!link) {
      alert('Customer phone number is not available.');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
    this.setStatus('WhatsApp message ready — press Send to notify the customer.', false);
  }

  // ─── Edit Booking ─────────────────────────────────────────────────────────
  onEditBooking(booking: AdminBooking): void {
    this.editingBooking.set(booking);
    this.editForm = {
      date: booking.date,
      time: booking.time,
      customerName: booking.customerName,
      phone: booking.phone || '',
      email: booking.email || '',
      service: booking.service || '',
    };
  }

  onSaveEdit(): void {
    const editing = this.editingBooking();
    if (!editing) return;

    if (!this.editForm.customerName.trim()) {
      alert('Customer name is required.');
      return;
    }

    const payload: UpdateBookingPayload = {
      id: editing.id,
      date: this.editForm.date,
      time: this.editForm.time,
      customerName: this.editForm.customerName.trim(),
      phone: this.editForm.phone.trim(),
      email: this.editForm.email.trim(),
      service: this.editForm.service,
    };

    this.adminService.updateBooking(payload).subscribe({
      next: () => {
        this.hideEditForm();
        this.loadBookings(payload.date);
        this.selectedDate.set(payload.date);
      },
      error: (err: Error) => {
        alert(err.message || 'Unable to update booking.');
      },
    });
  }

  hideEditForm(): void {
    this.editingBooking.set(null);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private setStatus(msg: string, isError: boolean): void {
    this.statusMessage.set(msg);
    this.statusIsError.set(isError);
  }

  formatDate(dateValue: string): string {
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  buildWhatsAppLink(booking: AdminBooking): string | null {
    return this.adminService.buildWhatsAppLink(booking);
  }

  isCancelled(booking: AdminBooking): boolean {
    return (booking.status || '').toLowerCase() === 'cancelled';
  }

  activeBookingCount(): number {
    return this.bookings().filter((booking) => !this.isCancelled(booking)).length;
  }

  cancelledBookingCount(): number {
    return this.bookings().filter((booking) => this.isCancelled(booking)).length;
  }

  selectedDateLabel(): string {
    return this.formatDate(this.selectedDate());
  }
}
