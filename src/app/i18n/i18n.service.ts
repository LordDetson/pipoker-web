import {Inject, Injectable, InjectionToken, DOCUMENT, PLATFORM_ID} from "@angular/core";
import {isPlatformBrowser} from "@angular/common";
import {Observable, ReplaySubject} from "rxjs";
import {Language, LANGUAGES, LanguageOption, TranslationKey, translations} from "./translations";
import {AppConstants} from "../common/app-constants";
import {LanguagePage, pageAddress} from "./language-pages";

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
  // The language the page's address names (/ru, /en, see language-pages.ts), null on an address without one
  addressLanguage: Language | null = null;
  // The current language and every one picked after it, for pages that put texts outside their template
  private readonly languageSubject = new ReplaySubject<Language>(1);
  readonly language$: Observable<Language> = this.languageSubject.asObservable();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(BROWSER_LANGUAGES) browserLanguages: readonly string[],
    @Inject(PLATFORM_ID) platform: Object
  ) {
    // The language picked in the header wins over the browser's one. The build, which prerenders the pages
    // without a browser, has none picked
    const chosen = isPlatformBrowser(platform) ? localStorage.getItem(AppConstants.language) : null;
    this.setLanguage(chosen === "en" || chosen === "ru" ? chosen : detectLanguage(browserLanguages));
  }

  get current(): LanguageOption {
    return LANGUAGES.find(option => option.code === this.language)!;
  }

  // Called on opening a page: an address with a language sets it for this visit, without remembering it, so the
  // next time the site is opened by an address without one it again follows the browser or the header's choice.
  // An address without one leaves the language as it was.
  useAddressLanguage(language: Language | null): void {
    this.addressLanguage = language;
    if (language !== null && language !== this.language) {
      this.setLanguage(language);
    }
  }

  // The address of a page to link to: in the language of the page's address, so search engines walking the site
  // stay in one language, or without one
  address(page: LanguagePage): string {
    return pageAddress(page, this.addressLanguage);
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
    this.document.querySelector('meta[name="description"]')?.setAttribute("content", this.translate("meta.description"));
    this.languageSubject.next(language);
  }
}
