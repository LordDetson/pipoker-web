import {Component, Inject, OnInit, DOCUMENT, ChangeDetectionStrategy} from '@angular/core';
import {ThemeService} from "../../services/theme.service";

@Component({
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ThemeSwitcherComponent implements OnInit {

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public theme: ThemeService
  ) {
  }

  ngOnInit(): void {
    setTimeout(() => {
      const root = this.document.documentElement;
      root.style.setProperty("--common-transition-duration", "0.8s");
    }, 10);
  }
}
