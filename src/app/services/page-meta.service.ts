import {Inject, Injectable, DOCUMENT} from "@angular/core";
import {Title} from "@angular/platform-browser";
import {I18nService} from "../i18n/i18n.service";
import {LanguagePage, pageAddress} from "../i18n/language-pages";
import {Language, LANGUAGES} from "../i18n/translations";

// The address search engines are given as the canonical one, the same for every environment (src/index.html
// names it too)
export const SITE_URL = "https://pipoker.app";

const OG_LOCALES: Record<Language, string> = {ru: "ru_RU", en: "en_US"};

export interface PageMeta {
  title: string;
  description: string;
  // The page, by its address without a language
  page: LanguagePage;
}

// What a page tells search engines about itself: the title, the description, the canonical address and the
// addresses of the page in each language (hreflang); the link preview in messengers repeats the first three. The page sets them when it opens and on a change of language,
// because the app changes pages without reloading the document. The canonical address is the one the page was
// opened by: with a language, or without one.
@Injectable({providedIn: "root"})
export class PageMetaService {

  constructor(@Inject(DOCUMENT) private document: Document, private title: Title, private i18n: I18nService) {
  }

  set(meta: PageMeta): void {
    const address = SITE_URL + pageAddress(meta.page, this.i18n.addressLanguage);
    this.title.setTitle(meta.title);
    this.document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
    this.document.querySelector('link[rel="canonical"]')?.setAttribute("href", address);
    this.openGraph("og:url", address);
    this.openGraph("og:title", meta.title);
    this.openGraph("og:image:alt", meta.title);
    this.openGraph("og:description", meta.description);
    this.openGraph("og:locale", OG_LOCALES[this.i18n.language]);
    this.openGraph("og:locale:alternate", OG_LOCALES[this.i18n.language === "ru" ? "en" : "ru"]);
    for (const language of LANGUAGES.map(option => option.code)) {
      this.alternate(language).setAttribute("href", SITE_URL + pageAddress(meta.page, language));
    }
    this.alternate("x-default").setAttribute("href", SITE_URL + meta.page);
  }

  private openGraph(property: string, content: string): void {
    this.document.querySelector(`meta[property="${property}"]`)?.setAttribute("content", content);
  }

  // The <link rel="alternate"> of a language; src/index.html carries the start page's ones
  private alternate(hreflang: string): Element {
    let link = this.document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if (link === null) {
      link = this.document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", hreflang);
      this.document.head.appendChild(link);
    }
    return link;
  }
}
