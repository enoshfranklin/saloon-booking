import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminBooking {
  id: string;
  date: string;
  time: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  service: string | null;
  status: string;
}

export interface UpdateBookingPayload {
  id: string;
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email: string;
  service: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  private adminToken = '';

  setToken(token: string): void {
    this.adminToken = token.trim();
  }

  getToken(): string {
    return this.adminToken;
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders(
      this.adminToken ? { 'x-admin-secret': this.adminToken } : {}
    );
  }

  // ─── WhatsApp logic (migrated exactly from admin.js) ─────────────────────
  private normalizeWhatsAppPhone(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone
      .replace(/\s+/g, '')
      .replace(/[+()\-\[\]]/g, '')
      .replace(/[^\d]/g, '');
    if (!digits) return '';
    if (digits.startsWith('91') && digits.length > 10) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  private buildCancellationMessage(booking: AdminBooking): string {
    const customerName = booking.customerName || 'Customer';
    const serviceName = booking.service || 'Service';
    const dateValue = booking.date
      ? new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Date';
    const timeValue = booking.time || 'Time';
    const lines = [
      `Hi ${customerName},`,
      '',
      `Your booking at Salon Booking has been cancelled.`,
      '',
      'Booking details:',
      `Service: ${serviceName}`,
      `Date: ${dateValue}`,
      `Time: ${timeValue}`,
      '',
      'We apologize for the inconvenience. Please contact us if you would like to reschedule.',
      '',
      'Thank you,',
      'Salon Booking',
    ];
    return encodeURIComponent(lines.join('\n'));
  }

  buildWhatsAppLink(booking: AdminBooking): string | null {
    const normalized = this.normalizeWhatsAppPhone(booking.phone);
    if (!normalized) return null;
    const message = this.buildCancellationMessage(booking);
    return `https://wa.me/${normalized}?text=${message}`;
  }

  // ─── API calls ───────────────────────────────────────────────────────────
  /** GET /api/bookings/admin?date=YYYY-MM-DD */
  fetchAdminBookings(date: string): Observable<AdminBooking[]> {
    return this.http
      .get<AdminBooking[]>(`${this.apiBase}/admin?date=${encodeURIComponent(date)}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /** DELETE /api/bookings/:id */
  deleteBooking(id: string): Observable<AdminBooking> {
    return this.http
      .delete<AdminBooking>(`${this.apiBase}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** PUT /api/bookings/:id */
  updateBooking(payload: UpdateBookingPayload): Observable<AdminBooking> {
    return this.http
      .put<AdminBooking>(`${this.apiBase}/${payload.id}`, payload, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.error?.error || error.message || 'An unexpected error occurred';
    return throwError(() => new Error(message));
  }
}
