import {Pipe, PipeTransform} from "@angular/core";
import {I18nService} from "./i18n.service";
import {serverErrorMessage} from "../common/room-validators";

// Impure like TranslatePipe, so the error follows the language as soon as it is switched in the header
@Pipe({
  name: "serverError",
  pure: false
})
export class ServerErrorPipe implements PipeTransform {

  constructor(private i18n: I18nService) {
  }

  transform(error: unknown): string {
    return serverErrorMessage(error, this.i18n);
  }
}
