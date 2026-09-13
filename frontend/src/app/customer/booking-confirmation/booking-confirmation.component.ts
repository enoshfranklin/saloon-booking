import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WebBackgroundComponent } from '../../shared/web-background/web-background.component';

interface BookingConfirmationState {
  id?: string;
  service?: string | null;
  date?: string;
  time?: string;
  customerName?: string;
  phone?: string | null;
  email?: string | null;
}

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [RouterLink, WebBackgroundComponent],
  templateUrl: './booking-confirmation.component.html',
  styleUrls: ['./booking-confirmation.component.scss'],
})
export class BookingConfirmationComponent implements OnInit {
  private readonly router = inject(Router);

  booking: BookingConfirmationState = {};

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as BookingConfirmationState | undefined;
    this.booking = {
      id: state?.id,
      service: state?.service ?? null,
      date: state?.date,
      time: state?.time,
      customerName: state?.customerName,
      phone: state?.phone ?? null,
      email: state?.email ?? null,
    };

    if (!this.booking.id && history.state?.booking) {
      this.booking = history.state.booking;
    }
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) return '—';
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  addToCalendar(): void {
    if (!this.booking.date || !this.booking.time) return;

    const date = this.booking.date;
    const formattedDate = new Date(`${date}T00:00:00`);
    const start = new Date(`${date}T${this.booking.time}`);
    const end = new Date(start.getTime() + 45 * 60000);
    const formatCalendarDate = (value: Date) =>
      value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const calendarText = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${this.booking.id || 'booking'}@skylinestudio`,
      `DTSTAMP:${formatCalendarDate(new Date())}`,
      `DTSTART:${formatCalendarDate(start)}`,
      `DTEND:${formatCalendarDate(end)}`,
      `SUMMARY:${this.booking.service || 'Salon Appointment'}`,
      `DESCRIPTION:Booked with Skyline Studio`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([calendarText], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `booking-${this.booking.id || 'appointment'}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
