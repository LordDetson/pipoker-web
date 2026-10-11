import {inject} from "@angular/core";
import {CanActivateFn} from "@angular/router";
import {I18nService} from "./i18n.service";

// Put on the routes of the pages with an address for each language (language-pages.ts): the route data names
// the address's language, none on an address without one
export const languageFromAddress: CanActivateFn = route => {
  inject(I18nService).useAddressLanguage(route.data["language"] ?? null);
  return true;
};
