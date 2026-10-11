import {Language} from "./translations";

// Search engines keep one language per address, and the robots of Google and Bing run the site with an English
// browser, so a page that picks its language by the browser was indexed in English only. The pages search engines
// show therefore have an address for each language: /ru and /en for the start page, /ru/guide and /en/guide for
// the guide. There the address sets the language. The addresses without one (/ and /guide) keep picking it by the
// browser for people who open a shared link, and search engines offer them to everyone else (hreflang x-default).

// The pages with an address for each language, by their address without one
export const LANGUAGE_PAGES = ["/", "/guide"] as const;

export type LanguagePage = typeof LANGUAGE_PAGES[number];

// The address of a page in a language, or without one for null
export function pageAddress(page: LanguagePage, language: Language | null): string {
  if (language === null) {
    return page;
  }
  return page === "/" ? `/${language}` : `/${language}${page}`;
}

// The language an address starts with, and the rest of it: "/en/guide?from=hn" is "en" and "/guide?from=hn"
export function splitAddress(url: string): {language: Language | null; rest: string} {
  const match = /^\/(ru|en)(?=[/?#]|$)(.*)$/.exec(url);
  if (match === null) {
    return {language: null, rest: url};
  }
  const rest = match[2].startsWith("/") ? match[2] : "/" + match[2];
  return {language: match[1] as Language, rest};
}

// The same address in another language: "/en/guide" is "/ru/guide", "/en?from=hn" is "/ru?from=hn"
export function switchAddress(url: string, language: Language): string {
  const {rest} = splitAddress(url);
  const prefix = `/${language}`;
  return rest === "/" || rest.startsWith("/?") || rest.startsWith("/#") ? prefix + rest.slice(1) : prefix + rest;
}
