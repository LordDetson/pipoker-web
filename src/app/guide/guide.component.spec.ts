import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {GuideComponent} from "./guide.component";
import {GUIDE} from "./guide-content";
import {BROWSER_LANGUAGES, I18nService} from "../i18n/i18n.service";
import {AppConstants} from "../common/app-constants";
import {translations} from "../i18n/translations";
import {VisitService} from "../services/visit.service";

describe("GuideComponent", () => {
  let fixture: ComponentFixture<GuideComponent>;
  let visits: jasmine.SpyObj<VisitService>;
  let description: HTMLMetaElement;
  let canonical: HTMLLinkElement;

  beforeEach(() => {
    localStorage.removeItem(AppConstants.language);
    visits = jasmine.createSpyObj<VisitService>("VisitService", ["report"]);
    description = document.createElement("meta");
    description.name = "description";
    document.head.appendChild(description);
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  });

  afterEach(() => {
    localStorage.removeItem(AppConstants.language);
    description.remove();
    canonical.remove();
    document.title = "";
  });

  function render(browserLanguages: string[]): HTMLElement {
    TestBed.configureTestingModule({
      imports: [GuideComponent],
      providers: [
        provideRouter([]),
        {provide: BROWSER_LANGUAGES, useValue: browserLanguages},
        {provide: VisitService, useValue: visits}
      ]
    });
    fixture = TestBed.createComponent(GuideComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it("reports the visit, since people land on the guide from search", () => {
    render(["en-US"]);

    expect(visits.report).toHaveBeenCalledTimes(1);
  });

  it("explains Planning Poker step by step, with how each step is done in PiPoker", () => {
    const guide = render(["en-US"]);

    expect(guide.querySelector("h1")!.textContent).toBe("How to run Planning Poker");
    const steps = Array.from(guide.querySelectorAll("ol.steps > li"));
    expect(steps.map(step => step.querySelector("h3")!.textContent)).toEqual(GUIDE.en.steps.items.map(step => step.title));
    expect(steps.every(step => step.querySelector(".in-pipoker")!.textContent!.includes("In PiPoker"))).toBeTrue();
    expect(guide.querySelectorAll("dl.mistakes dt").length).toBe(GUIDE.en.mistakes.items.length);
  });

  it("shows the screenshots in the language of the page", () => {
    const guide = render(["en-US"]);

    const images = Array.from(guide.querySelectorAll<HTMLImageElement>("figure.screenshot img"));
    expect(images.length).toBe(5);
    expect(images.map(image => image.getAttribute("src"))).toEqual([
      "/assets/guide/en/create.webp", "/assets/guide/en/voting.webp", "/assets/guide/en/phone.webp",
      "/assets/guide/en/revealed.webp", "/assets/guide/en/history.webp"
    ]);
    expect(images.every(image => image.alt !== "" && image.loading === "lazy")).toBeTrue();
    expect(guide.querySelector("figure.screenshot.phone img")!.getAttribute("src")).toBe("/assets/guide/en/phone.webp");
  });

  it("speaks Russian to a Russian browser and follows the language picked", () => {
    const guide = render(["ru-RU"]);

    expect(guide.querySelector("h1")!.textContent).toBe("Как провести Planning Poker");
    expect(guide.querySelector<HTMLImageElement>("figure.screenshot img")!.getAttribute("src"))
      .toBe("/assets/guide/ru/create.webp");

    TestBed.inject(I18nService).choose("en");
    fixture.detectChanges();

    expect(guide.querySelector("h1")!.textContent).toBe("How to run Planning Poker");
  });

  it("tells search engines its own title, description and address while it is open", () => {
    render(["ru-RU"]);

    expect(document.title).toBe(GUIDE.ru.title);
    expect(description.content).toBe(GUIDE.ru.description);
    expect(canonical.href).toBe("https://pipoker.app/guide");

    TestBed.inject(I18nService).choose("en");

    expect(document.title).toBe(GUIDE.en.title);
    expect(description.content).toBe(GUIDE.en.description);

    fixture.destroy();

    expect(document.title).toBe("PiPoker");
    expect(description.content).toBe(translations.en["meta.description"]);
    expect(canonical.href).toBe("https://pipoker.app/");
  });

  it("leads back to the start page to create a room", () => {
    const guide = render(["en-US"]);

    const button = guide.querySelector<HTMLAnchorElement>(".try-it a.btn")!;
    expect(button.textContent).toBe("Create a room");
    expect(button.getAttribute("href")).toBe("/");
  });

  it("has the same structure in both languages", () => {
    expect(GUIDE.ru.steps.items.length).toBe(GUIDE.en.steps.items.length);
    expect(GUIDE.ru.steps.items.map(step => step.image?.file)).toEqual(GUIDE.en.steps.items.map(step => step.image?.file));
    expect(GUIDE.ru.decks.items.map(deck => deck.cards)).toEqual(GUIDE.en.decks.items.map(deck => deck.cards));
    expect(GUIDE.ru.mistakes.items.length).toBe(GUIDE.en.mistakes.items.length);
  });
});
