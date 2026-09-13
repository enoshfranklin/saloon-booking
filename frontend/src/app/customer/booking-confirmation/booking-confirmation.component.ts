import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WebBackgroundComponent } from '../../shared/web-background/web-background.component';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [RouterLink, WebBackgroundComponent],
  templateUrl: './booking-confirmation.component.html',
  styleUrls: ['./booking-confirmation.component.scss'],
})
export class BookingConfirmationComponent {}
