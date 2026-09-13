import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpidermanAnimationComponent } from './shared/spiderman-animation/spiderman-animation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SpidermanAnimationComponent],
  template: `
    <div class="web-background" aria-hidden="true">
      <div class="web-orbit"></div>
      <div class="web-orbit web-orbit-two"></div>
      <div class="spider" aria-hidden="true">
        <div class="spider-body"></div>
      </div>
      <div class="web-emoji">🕸️</div>
    </div>
    <app-spiderman-animation></app-spiderman-animation>
    <router-outlet />
  `,
})
export class AppComponent {}
