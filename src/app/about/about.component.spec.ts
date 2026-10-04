import {TestBed} from "@angular/core/testing";
import {AboutComponent} from "./about.component";
import {TranslatePipe} from "../i18n/translate.pipe";
import {BROWSER_LANGUAGES} from "../i18n/i18n.service";
import {AppConstants} from "../common/app-constants";

describe("AboutComponent", () => {
  beforeEach(() => localStorage.removeItem(AppConstants.language));

  function render(browserLanguages: string[]): HTMLElement {
    TestBed.configureTestingModule({
      declarations: [AboutComponent],
      imports: [TranslatePipe],
      providers: [{provide: BROWSER_LANGUAGES, useValue: browserLanguages}]
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

  it("speaks Russian to a Russian browser", () => {
    const about = render(["ru-RU"]);

    expect(about.querySelector("h2")!.textContent).toBe("Что такое PiPoker?");
    expect(about.textContent).toContain("Бесплатно и без регистрации.");
  });
});
