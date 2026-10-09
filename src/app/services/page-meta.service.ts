import {Inject, Injectable, DOCUMENT} from "@angular/core";
import {Title} from "@angular/platform-browser";

// The address search engines are given as the canonical one, the same for every environment (src/index.html
// names it too)
export const SITE_URL = "https://pipoker.app";

export interface PageMeta {
  title: string;
  description: string;
  // The page's path, from "/"
  path: string;
}

// What a page tells search engines about itself: the title, the description and the canonical address.
// src/index.html carries the start page's ones; a page that has its own sets them while it is open and gives
// the start page's back when it closes, because the app changes pages without reloading the document.
@Injectable({providedIn: "root"})
export class PageMetaService {

  constructor(@Inject(DOCUMENT) private document: Document, private title: Title) {
  }

  set(meta: PageMeta): void {
    this.title.setTitle(meta.title);
    this.document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
    this.document.querySelector('link[rel="canonical"]')?.setAttribute("href", SITE_URL + meta.path);
  }

  // Back to the start page's tags; I18nService keeps the description in the current language
  reset(description: string): void {
    this.set({title: "PiPoker", description, path: "/"});
  }
}
