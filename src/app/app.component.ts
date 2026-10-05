import {Component, ChangeDetectionStrategy, Injector} from '@angular/core';
import {openBugReport} from "./bug-report/open-bug-report";

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

  reportProblem(): void {
    openBugReport(this.injector);
  }
}
