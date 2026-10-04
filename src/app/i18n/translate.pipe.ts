import {Pipe, PipeTransform} from "@angular/core";
import {I18nService} from "./i18n.service";
import {TranslationKey} from "./translations";

// Impure, so the page follows the language as soon as it is switched in the header
@Pipe({
  name: "translate",
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {

  constructor(private i18n: I18nService) {
  }

  transform(key: TranslationKey, params?: { [name: string]: string | number }): string {
    return this.i18n.translate(key, params);
  }
}
