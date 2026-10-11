import {Component, ChangeDetectionStrategy} from '@angular/core';
import {I18nService} from "../i18n/i18n.service";

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

  constructor(public i18n: I18nService) {
  }
}
