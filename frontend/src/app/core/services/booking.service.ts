import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── Time slot constants (migrated exactly from script.js) ───────────────────
export const SLOT_LENGTH_MINUTES = 45;
export const MORNING_SESSION_START_MINUTES = 10 * 60 + 30;
export const MORNING_SESSION_END_MINUTES = 13 * 60 + 30;
export const AFTERNOON_SESSION_START_MINUTES = 14 * 60 + 30;
export const AFTERNOON_SESSION_END_MINUTES = 19 * 60 + 15;

// 45-minute booking slots aligned to the salon schedule: 10:30 AM to 1:30 PM, then 2:30 PM to 7:00 PM
export const ALLOWED_SLOT_MINUTES: number[] = [
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

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TimeSlot {
  value: string;
  label: string;
  minutes: number;
}

export interface BookingRecord {
  id: string;
  date: string;
  time: string;
  status?: string;
}

export interface CreateBookingPayload {
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email: string;
  service: string;
}

export interface CreatedBooking {
  id: string;
  date: string;
  time: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  service: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  /** Format a Date to 12-hour time label (e.g. "10:30 AM") */
  formatTimeLabel(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = ((hours + 11) % 12) + 1;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  /** Parse "10:30 AM" or "14:30" to total minutes since midnight */
  parseTimeToMinutes(value: string | null | undefined): number | null {
    if (!value || typeof value !== 'string') return null;

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
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    }

    return null;
  }

  /** Format YYYY-MM-DD to "Sep 13, 2026" */
  formatDate(dateValue: string): string {
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Generate all time slots for a given date string (YYYY-MM-DD) */
  timeSlotsForDate(dateValue: string): TimeSlot[] {
    const [year, month, day] = dateValue.split('-').map(Number);
    const slots: TimeSlot[] = ALLOWED_SLOT_MINUTES.map((minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const dt = new Date(year, month - 1, day, hours, mins);
      const label = this.formatTimeLabel(dt);
      return { value: label, label, minutes };
    });
    slots.sort((a, b) => a.minutes - b.minutes);
    return slots;
  }

  /** Filter slots to only those not already booked */
  getAvailableSlots(dateValue: string, bookedRecords: BookingRecord[]): TimeSlot[] {
    const bookedMinutes = bookedRecords
      .map((b) => this.parseTimeToMinutes(b.time))
      .filter((m): m is number => m !== null);

    return this.timeSlotsForDate(dateValue).filter(
      (slot) => !bookedMinutes.includes(slot.minutes)
    );
  }

  /** Check if a given booking conflicts with existing records */
  conflictExists(booking: { date: string; time: string }, records: BookingRecord[]): boolean {
    return records.some((r) => r.date === booking.date && r.time === booking.time);
  }

  /** GET /api/bookings?date=YYYY-MM-DD */
  fetchBookings(date: string): Observable<BookingRecord[]> {
    return this.http
      .get<BookingRecord[]>(`${this.apiBase}?date=${encodeURIComponent(date)}`)
      .pipe(catchError(this.handleError));
  }

  /** POST /api/bookings */
  createBooking(payload: CreateBookingPayload): Observable<CreatedBooking> {
    return this.http
      .post<CreatedBooking>(this.apiBase, payload)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.error?.error || error.message || 'An unexpected error occurred';
    return throwError(() => new Error(message));
  }
}
