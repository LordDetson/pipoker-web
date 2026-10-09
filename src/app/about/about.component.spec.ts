import {TestBed} from "@angular/core/testing";
import {AboutComponent} from "./about.component";
import {TranslatePipe} from "../i18n/translate.pipe";
import {BROWSER_LANGUAGES} from "../i18n/i18n.service";
import {AppConstants} from "../common/app-constants";
import {provideRouter, RouterLink} from "@angular/router";

describe("AboutComponent", () => {
  beforeEach(() => localStorage.removeItem(AppConstants.language));

  function render(browserLanguages: string[]): HTMLElement {
    TestBed.configureTestingModule({
      declarations: [AboutComponent],
      imports: [TranslatePipe, RouterLink],
      providers: [provideRouter([]), {provide: BROWSER_LANGUAGES, useValue: browserLanguages}]
    });
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it("tells what PiPoker is and how it works", () => {
    const about = render(["en-US"]);

    expect(about.querySelector("h2")!.textContent).toBe("What is PiPoker?");
    expect(about.querySelectorAll("ol > li").length).toBe(3);
    expect(about.textContent).toContain("Free and without registration.");
  });

  it("leads to the guide on running Planning Poker", () => {
    const about = render(["en-US"]);

    const link = about.querySelector<HTMLAnchorElement>("a.guide-link")!;
    expect(link.getAttribute("href")).toBe("/guide");
    expect(link.textContent).toBe("How to run Planning Poker: a step-by-step guide");
  });

  it("speaks Russian to a Russian browser", () => {
    const about = render(["ru-RU"]);

    expect(about.querySelector("h2")!.textContent).toBe("Что такое PiPoker?");
    expect(about.textContent).toContain("Бесплатно и без регистрации.");
  });
});
