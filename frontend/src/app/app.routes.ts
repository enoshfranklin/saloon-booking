import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./customer/booking-page/booking-page.component').then(
        (m) => m.BookingPageComponent
      ),
  },
  {
    path: 'booking/success',
    loadComponent: () =>
      import('./customer/booking-confirmation/booking-confirmation.component').then(
        (m) => m.BookingConfirmationComponent
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
