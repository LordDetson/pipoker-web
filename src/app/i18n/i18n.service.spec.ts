import {TestBed} from "@angular/core/testing";
import {BROWSER_LANGUAGES, detectLanguage, I18nService} from "./i18n.service";
import {AppConstants} from "../common/app-constants";
import {translations} from "./translations";

describe("detectLanguage", () => {
  it("picks Russian for the languages of the CIS", () => {
    for (const language of ["ru", "ru-RU", "be-BY", "kk", "ky-KG", "uz", "tg", "tk", "az-AZ", "hy"]) {
      expect(detectLanguage([language])).withContext(language).toBe("ru");
    }
  });

  it("picks English for English and for languages it has no interface for", () => {
    expect(detectLanguage(["en-GB"])).toBe("en");
    expect(detectLanguage(["de-DE"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });

  it("follows the first language the browser prefers that it knows", () => {
    expect(detectLanguage(["uk-UA", "ru-RU", "en-US"])).toBe("ru");
    expect(detectLanguage(["de-DE", "en-US", "ru-RU"])).toBe("en");
  });
});

describe("I18nService", () => {
  beforeEach(() => localStorage.removeItem(AppConstants.language));

  afterEach(() => {
    localStorage.removeItem(AppConstants.language);
    document.documentElement.lang = "en";
    document.querySelector('meta[name="description"]')?.remove();
  });

  function create(browserLanguages: string[]): I18nService {
    TestBed.configureTestingModule({providers: [{provide: BROWSER_LANGUAGES, useValue: browserLanguages}]});
    return TestBed.inject(I18nService);
  }

  it("speaks the browser's language and marks the page with it", () => {
    const i18n = create(["ru-RU"]);

    expect(i18n.language).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
    expect(i18n.translate("header.tagline")).toBe("Бесплатный Planning Poker для команд");
  });

  it("remembers the language picked and prefers it to the browser's one", () => {
    const i18n = create(["ru-RU"]);

    i18n.choose("en");

    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(AppConstants.language)).toBe("en");
    expect(new I18nService(document, ["ru-RU"]).language).toBe("en");
  });

  it("puts the description in the language picked", () => {
    const description = document.createElement("meta");
    description.name = "description";
    document.head.appendChild(description);
    const i18n = create(["ru-RU"]);

    expect(description.content).toBe(translations.ru["meta.description"]);

    i18n.choose("en");

    expect(description.content).toBe(translations.en["meta.description"]);
  });

  it("tells the current language and every one picked after it", () => {
    const i18n = create(["ru-RU"]);
    const languages: string[] = [];
    i18n.language$.subscribe(language => languages.push(language));

    i18n.choose("en");
    i18n.choose("ru");

    expect(languages).toEqual(["ru", "en", "ru"]);
  });

  it("fills in placeholders", () => {
    const i18n = create(["en-US"]);

    expect(i18n.translate("validation.minLength", {field: "Nickname", length: 2}))
      .toBe("Nickname must be at least 2 characters long");
    expect(i18n.translate("validation.required")).toBe("{field} is required");
  });

  it("has a Russian text for every English one", () => {
    expect(Object.keys(translations.ru).sort()).toEqual(Object.keys(translations.en).sort());
    for (const [key, text] of Object.entries(translations.ru)) {
      expect(text.trim()).withContext(key).not.toBe("");
    }
  });
});
