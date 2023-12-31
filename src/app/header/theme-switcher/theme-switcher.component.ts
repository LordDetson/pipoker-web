import {Component, Inject, OnInit, Renderer2} from '@angular/core';
import {DOCUMENT} from "@angular/common";
import {AppConstants} from "../../common/app-constants";
import {ThemeService} from "ng2-charts";
import {Chart, ChartOptions} from "chart.js";

@Component({
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.scss']
})
export class ThemeSwitcherComponent implements OnInit {

  isLightTheme: boolean;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer2: Renderer2,
    private themeService: ThemeService
  ) {
  }

  ngOnInit(): void {
    this.isLightTheme = JSON.parse(localStorage.getItem(AppConstants.lastTheme) as string) ?? false;
    this.updateTheme();
    setTimeout(() => {
      const root = this.document.documentElement;
      root.style.setProperty("--common-transition-duration", "0.8s");
    }, 10);
  }

  onThemeSwitchChange(): void {
    this.isLightTheme = !this.isLightTheme;
    this.updateTheme();
    localStorage.setItem(AppConstants.lastTheme, this.isLightTheme.toString())
  }

  private updateTheme() {
    this.renderer2.setAttribute(this.document.body, 'data-bs-theme', this.isLightTheme ? 'light' : 'dark');
    let overrides: ChartOptions = {};
    if (this.isLightTheme) {
      Chart.defaults.set('plugins.datalabels', {
        color: '#343a40'
      });
    } else {
      Chart.defaults.set('plugins.datalabels', {
        color: '#ffffff'
      });
    }
    this.themeService.setColorschemesOptions(overrides);
  }
}
