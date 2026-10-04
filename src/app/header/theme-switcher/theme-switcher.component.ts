import {Component, Inject, OnInit} from '@angular/core';
import {DOCUMENT} from "@angular/common";
import {ThemeService} from "../../services/theme.service";

@Component({
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.scss']
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
