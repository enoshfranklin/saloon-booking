import { Component } from '@angular/core';
import {
  trigger,
  transition,
  animate,
  keyframes,
  style,
} from '@angular/animations';

@Component({
  selector: 'app-spiderman-animation',
  standalone: true,
  template: `
    <div class="spider-wrap">
      <div class="web-line" aria-hidden="true" [@webSway]></div>
      <div class="spider" role="img" aria-label="Spinning spider" [@swing]="'active'">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <circle cx="50" cy="50" r="18" class="body" />
          <circle cx="42" cy="45" r="3" class="eye" />
          <circle cx="58" cy="45" r="3" class="eye" />
          <path d="M30 30 L20 20 M70 30 L80 20 M30 70 L20 80 M70 70 L80 80" stroke="#111" stroke-width="2" stroke-linecap="round" fill="none" />
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      .spider-wrap {
        position: fixed;
        top: 12px;
        left: 12px;
        width: 80px;
        height: 120px;
        pointer-events: none;
        z-index: 9999;
      }

      .web-line {
        position: absolute;
        left: 50%;
        width: 2px;
        height: 100px;
        background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.05));
        transform: translateX(-50%);
        transform-origin: top center;
      }

      .spider {
        position: absolute;
        top: 60px;
        left: 50%;
        transform-origin: top center;
        transform: translateX(-50%);
        width: 40px;
        height: 40px;
      }

      svg {
        width: 100%;
        height: 100%;
      }

      .body {
        fill: #d32f2f;
        stroke: #111;
        stroke-width: 2px;
      }

      .eye {
        fill: #111;
      }
    `,
  ],
  animations: [
    trigger('swing', [
      transition(':enter', [
        animate(
          '2s ease-in-out',
          keyframes([
            style({ transform: 'translateX(-50%) rotate(-12deg) translateY(0)', offset: 0 }),
            style({ transform: 'translateX(-50%) rotate(12deg) translateY(6px)', offset: 0.5 }),
            style({ transform: 'translateX(-50%) rotate(-12deg) translateY(0)', offset: 1 }),
          ])
        ),
      ]),
      transition('* => *', [
        animate(
          '2s ease-in-out',
          keyframes([
            style({ transform: 'translateX(-50%) rotate(-12deg) translateY(0)', offset: 0 }),
            style({ transform: 'translateX(-50%) rotate(12deg) translateY(6px)', offset: 0.5 }),
            style({ transform: 'translateX(-50%) rotate(-12deg) translateY(0)', offset: 1 }),
          ])
        ),
      ]),
    ]),
    trigger('webSway', [
      transition(':enter', [
        animate(
          '2s ease-in-out',
          keyframes([
            style({ transform: 'translateX(-50%) scaleY(1)', offset: 0 }),
            style({ transform: 'translateX(-50%) scaleY(1.02)', offset: 0.5 }),
            style({ transform: 'translateX(-50%) scaleY(1)', offset: 1 }),
          ])
        ),
      ]),
      transition('* => *', [
        animate(
          '2s ease-in-out',
          keyframes([
            style({ transform: 'translateX(-50%) scaleY(1)', offset: 0 }),
            style({ transform: 'translateX(-50%) scaleY(1.02)', offset: 0.5 }),
            style({ transform: 'translateX(-50%) scaleY(1)', offset: 1 }),
          ])
        ),
      ]),
    ]),
  ],
})
export class SpidermanAnimationComponent {}

