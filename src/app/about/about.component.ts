import {Component, ChangeDetectionStrategy} from '@angular/core';

// Tells newcomers what PiPoker is, beside the forms of the start page and of the page joining a room
// on wide screens and under them on narrow ones
@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AboutComponent {
}
