import {Inject, Injectable, DOCUMENT} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";
import {AppConstants} from "../common/app-constants";

// The colour theme of the page: Bootstrap's one on the body, and whatever else follows it, like the chart's labels
@Injectable({providedIn: "root"})
export class ThemeService {

  // Bootstrap's page background in each theme
  private static readonly lightBackground = "#ffffff";
  private static readonly darkBackground = "#212529";

  private readonly light: BehaviorSubject<boolean>;

  readonly isLight$: Observable<boolean>;

  constructor(
    @Inject(DOCUMENT) private document: Document
  ) {
    this.light = new BehaviorSubject<boolean>(JSON.parse(localStorage.getItem(AppConstants.lastTheme) as string) ?? false);
    this.isLight$ = this.light.asObservable();
    this.apply();
  }

  get isLight(): boolean {
    return this.light.value;
  }

  // Called when the theme is switched in the header
  toggle(): void {
    this.light.next(!this.light.value);
    this.apply();
    localStorage.setItem(AppConstants.lastTheme, this.light.value.toString());
  }

  private apply(): void {
    this.document.body.setAttribute("data-bs-theme", this.light.value ? "light" : "dark");
    // The title bar of the installed app and of the mobile browser takes this colour, so it matches the page
    this.document.querySelector("meta[name=theme-color]")
      ?.setAttribute("content", this.light.value ? ThemeService.lightBackground : ThemeService.darkBackground);
  }
}
