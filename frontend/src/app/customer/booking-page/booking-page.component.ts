import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WebBackgroundComponent } from '../../shared/web-background/web-background.component';
import {
  BookingService,
  BookingRecord,
  TimeSlot,
  CreateBookingPayload,
} from '../../core/services/booking.service';

export type BookingStep = 1 | 2 | 3 | 4;

export interface BookingState {
  service: string;
  date: string;
  time: string;
  customerName: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, WebBackgroundComponent],
  templateUrl: './booking-page.component.html',
  styleUrls: ['./booking-page.component.scss'],
})
export class BookingPageComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly router = inject(Router);

  // ─── State ──────────────────────────────────────────────────────────────
  activeStep = signal<BookingStep>(1);
  bookingsCache = signal<BookingRecord[]>([]);
  availableSlots = signal<TimeSlot[]>([]);
  statusMessage = signal('');
  isSubmitting = signal(false);

  readonly stepLabels = ['Service', 'Date & Time', 'Details', 'Confirm'];

  // Slots split at the lunch break (12:45 PM is the last morning slot)
  morningSlots = computed(() =>
    this.availableSlots().filter((s) => s.minutes <= 12 * 60 + 45)
  );
  afternoonSlots = computed(() =>
    this.availableSlots().filter((s) => s.minutes >= 14 * 60 + 30)
  );
  // Show break indicator only when there are slots on both sides
  showBreak = computed(
    () => this.morningSlots().length > 0 || this.afternoonSlots().length > 0
  );

  booking: BookingState = {
    service: '',
    date: new Date().toISOString().slice(0, 10),
    time: '',
    customerName: '',
    phone: '',
    email: '',
  };

  // ─── Services ────────────────────────────────────────────────────────────
  readonly services = [
    { value: 'Haircut', name: 'Haircut', meta: 'Classic cut' },
    { value: 'Beard', name: 'Beard', meta: 'Trim & shape' },
    { value: 'Haircut + Beard', name: 'Haircut + Beard', meta: 'Complete refresh' },
    { value: 'Color', name: 'Color', meta: 'Tone & finish' },
    { value: 'Style', name: 'Style', meta: 'Finish & finesse' },
  ];

  ngOnInit(): void {
    this.loadBookings(this.booking.date);
  }

  // ─── Step navigation ────────────────────────────────────────────────────
  goToStep(step: BookingStep): void {
    this.activeStep.set(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Step 1: Service ────────────────────────────────────────────────────
  selectService(value: string): void {
    this.booking.service = value;
  }

  onServiceNext(): void {
    if (!this.booking.service) {
      this.statusMessage.set('Please select a service to continue.');
      return;
    }
    this.statusMessage.set('');
    this.goToStep(2);
    this.loadBookings(this.booking.date);
  }

  // ─── Step 2: Date & Time ────────────────────────────────────────────────
  onDateChange(date: string): void {
    this.booking.date = date;
    this.booking.time = '';
    this.loadBookings(date);
  }

  onTodayClick(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.booking.date = today;
    this.booking.time = '';
    this.loadBookings(today);
  }

  selectTime(slot: TimeSlot): void {
    this.booking.time = slot.value;
  }

  onDateNext(): void {
    if (!this.booking.date) {
      this.statusMessage.set('Please choose a date.');
      return;
    }
    if (!this.booking.time) {
      this.statusMessage.set('Please choose an available time.');
      return;
    }
    this.statusMessage.set('');
    this.goToStep(3);
  }

  // ─── Step 3: Customer Details ────────────────────────────────────────────
  onDetailsNext(): void {
    if (!this.booking.customerName.trim()) {
      this.statusMessage.set('Please enter your full name.');
      return;
    }
    this.statusMessage.set('');
    this.goToStep(4);
  }

  // ─── Step 4: Confirm ────────────────────────────────────────────────────
  onConfirmSubmit(): void {
    if (this.isSubmitting()) return;

    if (!this.booking.customerName.trim()) {
      this.statusMessage.set('Please add a customer name.');
      this.goToStep(3);
      return;
    }
    if (!this.booking.time) {
      this.statusMessage.set('Please choose an available time slot.');
      this.goToStep(2);
      return;
    }
    if (!this.booking.service) {
      this.statusMessage.set('Please select a service.');
      this.goToStep(1);
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('');

    // Re-check availability, then submit
    this.bookingService.fetchBookings(this.booking.date).subscribe({
      next: (fresh) => {
        this.bookingsCache.set(fresh);
        this.updateAvailableSlots(this.booking.date);

        if (this.bookingService.conflictExists(this.booking, fresh)) {
          this.statusMessage.set(
            'Sorry, this time slot was just booked. Please choose another time.'
          );
          this.goToStep(2);
          this.isSubmitting.set(false);
          return;
        }

        this.submitBooking();
      },
      error: () => {
        // Proceed even if re-check fails; server validates
        this.submitBooking();
      },
    });
  }

  private submitBooking(): void {
    const payload: CreateBookingPayload = {
      date: this.booking.date,
      time: this.booking.time,
      customerName: this.booking.customerName.trim(),
      phone: this.booking.phone.trim(),
      email: this.booking.email.trim(),
      service: this.booking.service,
    };

    this.bookingService.createBooking(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/booking/success']);
      },
      error: (err: Error) => {
        this.isSubmitting.set(false);
        const msg = err.message || '';
        if (msg.includes('already booked') || msg.includes('Timeslot')) {
          this.statusMessage.set(
            'Sorry, this time slot was just booked. Please choose another time.'
          );
          this.loadBookings(this.booking.date);
          this.goToStep(2);
        } else {
          this.statusMessage.set(msg || 'Unable to save your booking. Please try again.');
        }
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private loadBookings(date: string): void {
    this.statusMessage.set('Loading available slots...');
    this.bookingService.fetchBookings(date).subscribe({
      next: (records) => {
        this.bookingsCache.set(records);
        this.statusMessage.set('');
        this.updateAvailableSlots(date);
      },
      error: () => {
        this.bookingsCache.set([]);
        this.statusMessage.set(
          'Unable to load available times right now. Please try another date.'
        );
        this.updateAvailableSlots(date);
      },
    });
  }

  private updateAvailableSlots(date: string): void {
    this.availableSlots.set(
      this.bookingService.getAvailableSlots(date, this.bookingsCache())
    );
  }

  formatDate(dateValue: string): string {
    return this.bookingService.formatDate(dateValue);
  }
}
