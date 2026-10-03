import {AbstractControl, ValidationErrors} from "@angular/forms";

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

export function validationMessage(errors: ValidationErrors | null | undefined, field: string): string | undefined {
  if (!errors) {
    return undefined;
  }
  if (errors["required"]) {
    return field + " is required";
  }
  if (errors["minlength"]) {
    return field + " must be at least " + errors["minlength"].requiredLength + " characters long";
  }
  if (errors["maxlength"]) {
    return field + " must be at most " + errors["maxlength"].requiredLength + " characters long";
  }
  if (errors["tooManyCards"]) {
    return "The deck can contain at most " + errors["tooManyCards"].max + " cards";
  }
  if (errors["cardTooLong"]) {
    return "Card values can be at most " + RoomValidators.maxCardLength + " characters long: "
      + errors["cardTooLong"].cards.join(", ");
  }
  if (errors["duplicateCards"]) {
    return "Card values must be unique: " + errors["duplicateCards"].cards.join(", ");
  }
  if (errors["taken"]) {
    return errors["taken"].nickname + " is already in the room";
  }
  return undefined;
}

// Errors from the server arrive as {destination, message}.
export function errorMessage(error: any): string {
  return error?.message ?? String(error);
}
