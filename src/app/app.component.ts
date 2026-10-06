import {Component, ChangeDetectionStrategy, Injector} from '@angular/core';
import {openFeedback} from "./feedback/open-feedback";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AppComponent {

  constructor(private injector: Injector) {
  }

  showFeedback(): void {
    openFeedback(this.injector);
  }
}
