import {Component, ChangeDetectionStrategy} from '@angular/core';

// Tells newcomers what PiPoker is, under the forms of the start page and of the page joining a room
@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AboutComponent {
}
