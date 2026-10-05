import {AbstractControl, ValidationErrors} from "@angular/forms";
import {I18nService} from "../i18n/i18n.service";
import {TranslationKey} from "../i18n/translations";
import {ErrorCode, ErrorEvent} from "../models/room-event";

// The same limits pipoker-app checks when a room is created or joined, so the forms reject what the server would.
export class RoomValidators {
  public static readonly minNameLength: number = 2;
  public static readonly maxNameLength: number = 32;
  public static readonly maxCards: number = 20;
  public static readonly maxCardLength: number = 6;

  // Nicknames and room names are trimmed by the server before their length is checked.
  public static displayName(control: AbstractControl): ValidationErrors | null {
    const name: string = (control.value ?? "").trim();
    if (name.length === 0) {
      return {required: true};
    }
    if (name.length < RoomValidators.minNameLength) {
      return {minlength: {requiredLength: RoomValidators.minNameLength, actualLength: name.length}};
    }
    if (name.length > RoomValidators.maxNameLength) {
      return {maxlength: {requiredLength: RoomValidators.maxNameLength, actualLength: name.length}};
    }
    return null;
  }

  public static deck(control: AbstractControl): ValidationErrors | null {
    const cards = parseDeck(control.value ?? "");
    if (cards.length === 0) {
      return {required: true};
    }
    if (cards.length > RoomValidators.maxCards) {
      return {tooManyCards: {max: RoomValidators.maxCards, actual: cards.length}};
    }
    const tooLong = cards.filter(card => card.length > RoomValidators.maxCardLength);
    if (tooLong.length > 0) {
      return {cardTooLong: {cards: tooLong}};
    }
    const duplicates = cards.filter((card, index) =>
      cards.findIndex(other => other.toLowerCase() === card.toLowerCase()) !== index);
    if (duplicates.length > 0) {
      return {duplicateCards: {cards: duplicates}};
    }
    return null;
  }
}

// Splits "1h; 2h; 1d" into card values, ignoring spaces around them and empty entries.
export function parseDeck(deck: string): string[] {
  return deck.split(";")
    .map(card => card.trim())
    .filter(card => card.length > 0);
}

export function validationMessage(errors: ValidationErrors | null | undefined, field: TranslationKey,
                                  i18n: I18nService): string | undefined {
  if (!errors) {
    return undefined;
  }
  const name = i18n.translate(field);
  if (errors["required"]) {
    return i18n.translate("validation.required", {field: name});
  }
  if (errors["minlength"]) {
    return i18n.translate("validation.minLength", {field: name, length: errors["minlength"].requiredLength});
  }
  if (errors["maxlength"]) {
    return i18n.translate("validation.maxLength", {field: name, length: errors["maxlength"].requiredLength});
  }
  if (errors["tooManyCards"]) {
    return i18n.translate("validation.tooManyCards", {max: errors["tooManyCards"].max});
  }
  if (errors["cardTooLong"]) {
    return i18n.translate("validation.cardTooLong",
      {length: RoomValidators.maxCardLength, cards: errors["cardTooLong"].cards.join(", ")});
  }
  if (errors["duplicateCards"]) {
    return i18n.translate("validation.duplicateCards", {cards: errors["duplicateCards"].cards.join(", ")});
  }
  if (errors["taken"]) {
    return i18n.translate("validation.nicknameTaken", {nickname: errors["taken"].nickname});
  }
  return undefined;
}

const SERVER_ERRORS: Record<ErrorCode, TranslationKey> = {
  [ErrorCode.roomNotFound]: "serverError.roomNotFound",
  [ErrorCode.nicknameTaken]: "serverError.nicknameTaken",
  [ErrorCode.participantNotFound]: "serverError.participantNotFound",
  [ErrorCode.watcherCannotVote]: "serverError.watcherCannotVote",
  [ErrorCode.cardNotInDeck]: "serverError.cardNotInDeck",
  [ErrorCode.cardsRevealed]: "serverError.cardsRevealed",
  [ErrorCode.roundNotRevealed]: "serverError.roundNotRevealed",
  [ErrorCode.invalidData]: "serverError.invalidData",
  [ErrorCode.unexpected]: "serverError.unexpected"
};

// Errors from the server arrive as {destination, message, code}: the code picks the text, the English message is
// for developers. Anything else, such as a code this page doesn't know yet, is told as a failure of the server.
export function serverErrorMessage(error: unknown, i18n: I18nService): string {
  const code = (error as Partial<ErrorEvent> | undefined)?.code;
  return i18n.translate(code && code in SERVER_ERRORS ? SERVER_ERRORS[code] : "serverError.unexpected");
}
