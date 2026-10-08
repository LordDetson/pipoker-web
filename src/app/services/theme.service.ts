import {Inject, Injectable, DOCUMENT} from "@angular/core";
import {AppConstants} from "../common/app-constants";

// The colour theme of the page: Bootstrap's one on the body, and the colour of the title bar
@Injectable({providedIn: "root"})
export class ThemeService {

  // Bootstrap's page background in each theme
  private static readonly lightBackground = "#ffffff";
  private static readonly darkBackground = "#212529";

  private light: boolean;

  constructor(
    @Inject(DOCUMENT) private document: Document
  ) {
    this.light = JSON.parse(localStorage.getItem(AppConstants.lastTheme) as string) ?? false;
    this.apply();
  }

  get isLight(): boolean {
    return this.light;
  }

  // Called when the theme is switched in the header
  toggle(): void {
    this.light = !this.light;
    this.apply();
    localStorage.setItem(AppConstants.lastTheme, this.light.toString());
  }

  private apply(): void {
    this.document.body.setAttribute("data-bs-theme", this.light ? "light" : "dark");
    // The title bar of the installed app and of the mobile browser takes this colour, so it matches the page
    this.document.querySelector("meta[name=theme-color]")
      ?.setAttribute("content", this.light ? ThemeService.lightBackground : ThemeService.darkBackground);
  }
}
