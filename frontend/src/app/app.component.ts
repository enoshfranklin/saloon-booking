import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpidermanAnimationComponent } from './shared/spiderman-animation/spiderman-animation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SpidermanAnimationComponent],
  template: `<app-spiderman-animation></app-spiderman-animation><router-outlet />`,
})
export class AppComponent {}
