import {Inject, Injectable, DOCUMENT, PLATFORM_ID} from "@angular/core";
import {isPlatformBrowser} from "@angular/common";
import {AppConstants} from "../common/app-constants";

// The colour theme of the page: Bootstrap's one on the body, and the colour of the title bar
@Injectable({providedIn: "root"})
export class ThemeService {

  // Bootstrap's page background in each theme
  private static readonly lightBackground = "#ffffff";
  private static readonly darkBackground = "#212529";

  private light: boolean;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platform: Object
  ) {
    // The build prerenders the pages without a browser; they get the dark theme, like index.html
    this.light = isPlatformBrowser(platform)
      && (JSON.parse(localStorage.getItem(AppConstants.lastTheme) as string) ?? false);
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
