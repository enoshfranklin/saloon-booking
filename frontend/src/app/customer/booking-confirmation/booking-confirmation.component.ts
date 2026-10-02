import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

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
  imports: [RouterLink],
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

  goToMyBooking(): void {
    void this.router.navigateByUrl('/booking/details', {
      state: { booking: this.booking },
    }).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
