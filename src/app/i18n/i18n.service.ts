import {Inject, Injectable, InjectionToken} from "@angular/core";
import {DOCUMENT} from "@angular/common";
import {Language, LANGUAGES, LanguageOption, TranslationKey, translations} from "./translations";
import {AppConstants} from "../common/app-constants";

// The languages the browser asks for, most preferred first
export const BROWSER_LANGUAGES = new InjectionToken<readonly string[]>("Languages preferred by the browser", {
  providedIn: "root",
  factory: () => navigator.languages?.length ? navigator.languages : [navigator.language]
});

// Languages of the CIS whose speakers are offered the Russian interface: most of them read Russian
// more easily than English. Other languages fall through to the next one the browser prefers.
const RUSSIAN_READERS = ["ru", "be", "kk", "ky", "uz", "tg", "tk", "az", "hy"];

export function detectLanguage(browserLanguages: readonly string[]): Language {
  for (const tag of browserLanguages) {
    const language = tag.split("-")[0].toLowerCase();
    if (language === "en") {
      return "en";
    }
    if (RUSSIAN_READERS.includes(language)) {
      return "ru";
    }
  }
  return "en";
}

@Injectable({providedIn: "root"})
export class I18nService {

  language: Language;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(BROWSER_LANGUAGES) browserLanguages: readonly string[]
  ) {
    // The language picked in the header wins over the browser's one
    const chosen = localStorage.getItem(AppConstants.language);
    this.setLanguage(chosen === "en" || chosen === "ru" ? chosen : detectLanguage(browserLanguages));
  }

  get current(): LanguageOption {
    return LANGUAGES.find(option => option.code === this.language)!;
  }

  // Called when the language is picked in the header
  choose(language: Language): void {
    this.setLanguage(language);
    localStorage.setItem(AppConstants.language, language);
  }

  translate(key: TranslationKey, params: { [name: string]: string | number } = {}): string {
    return translations[this.language][key].replace(/\{(\w+)}/g, (placeholder, name) =>
      name in params ? String(params[name]) : placeholder);
  }

  private setLanguage(language: Language): void {
    this.language = language;
    this.document.documentElement.lang = language;
    this.document.title = this.translate("meta.title");
    this.document.querySelector('meta[name="description"]')?.setAttribute("content", this.translate("meta.description"));
  }
}
