import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-web-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="web-background" aria-hidden="true">
      <div class="web-orbit web-orbit-one"></div>
      <div class="web-orbit web-orbit-two"></div>
      <div class="spider"><span class="spider-body"></span></div>
      <div class="web-emoji">🕸️</div>
    </div>
  `,
})
export class WebBackgroundComponent {}
