import {FormControl} from "@angular/forms";
import {I18nService} from "../i18n/i18n.service";
import {AppConstants} from "./app-constants";
import {errorMessage, parseDeck, RoomValidators, validationMessage} from "./room-validators";

describe("RoomValidators", () => {

  function nameErrors(value: string | null) {
    return RoomValidators.displayName(new FormControl(value));
  }

  function deckErrors(value: string) {
    return RoomValidators.deck(new FormControl(value));
  }

  it("accepts names of 2 to 32 characters around which spaces are ignored", () => {
    expect(nameErrors("Al")).toBeNull();
    expect(nameErrors("  Al  ")).toBeNull();
    expect(nameErrors("x".repeat(32))).toBeNull();
  });

  it("rejects blank, too short and too long names", () => {
    expect(nameErrors(null)).toEqual({required: true});
    expect(nameErrors("   ")).toEqual({required: true});
    expect(nameErrors(" a ")).toEqual({minlength: {requiredLength: 2, actualLength: 1}});
    expect(nameErrors("x".repeat(33))).toEqual({maxlength: {requiredLength: 32, actualLength: 33}});
  });

  it("accepts decks of up to 20 unique cards of up to 6 characters", () => {
    expect(deckErrors("NA; 1h; 1.5h; 2h; 3h; 4h; 6h; 1d; 1.5d; 2d; 3d; 4d; 1w; 1.5w; 2w; 2.5w; 3w")).toBeNull();
    expect(deckErrors("123456")).toBeNull();
    expect(deckErrors(Array.from({length: 20}, (_, index) => "c" + index).join("; "))).toBeNull();
  });

  it("rejects empty decks, too many cards, too long cards and repeated cards", () => {
    expect(deckErrors("")).toEqual({required: true});
    expect(deckErrors(" ; ;")).toEqual({required: true});
    expect(deckErrors(Array.from({length: 21}, (_, index) => "c" + index).join("; "))).toEqual({tooManyCards: {max: 20, actual: 21}});
    expect(deckErrors("1; 1234567; 2; forever")).toEqual({cardTooLong: {cards: ["1234567", "forever"]}});
    expect(deckErrors("XL; S; xl")).toEqual({duplicateCards: {cards: ["xl"]}});
  });

  it("splits a deck into trimmed card values", () => {
    expect(parseDeck(" 1h ;2h;; 1d ;")).toEqual(["1h", "2h", "1d"]);
  });

  function i18n(language: string): I18nService {
    localStorage.removeItem(AppConstants.language);
    return new I18nService(document, [language]);
  }

  it("describes every validation error", () => {
    const english = i18n("en");
    expect(validationMessage(null, "validation.nickname", english)).toBeUndefined();
    expect(validationMessage({}, "validation.nickname", english)).toBeUndefined();
    expect(validationMessage({required: true}, "validation.nickname", english)).toBe("Nickname is required");
    expect(validationMessage(nameErrors("a"), "validation.nickname", english))
      .toBe("Nickname must be at least 2 characters long");
    expect(validationMessage(nameErrors("x".repeat(33)), "validation.roomName", english))
      .toBe("Room name must be at most 32 characters long");
    expect(validationMessage({tooManyCards: {max: 20, actual: 21}}, "validation.deck", english))
      .toBe("The deck can contain at most 20 cards");
    expect(validationMessage({cardTooLong: {cards: ["forever", "always"]}}, "validation.deck", english))
      .toBe("Card values can be at most 6 characters long: forever, always");
    expect(validationMessage({duplicateCards: {cards: ["xl"]}}, "validation.deck", english))
      .toBe("Card values must be unique: xl");
    expect(validationMessage({taken: {nickname: "Alex"}}, "validation.nickname", english))
      .toBe("Alex is already in the room");
  });

  it("describes validation errors in Russian", () => {
    const russian = i18n("ru");
    expect(validationMessage({required: true}, "validation.roomName", russian))
      .toBe("Заполните поле «Название комнаты»");
    expect(validationMessage(nameErrors("a"), "validation.nickname", russian))
      .toBe("Поле «Имя» должно содержать не меньше 2 символов");
    expect(validationMessage({tooManyCards: {max: 20, actual: 21}}, "validation.deck", russian))
      .toBe("В колоде может быть не больше 20 карт");
    expect(validationMessage({taken: {nickname: "Alex"}}, "validation.nickname", russian)).toBe("Alex уже в комнате");
  });

  it("describes server errors", () => {
    expect(errorMessage({destination: "/app/room/create", message: "invalid deck"})).toBe("invalid deck");
    expect(errorMessage("Whoops! Lost connection")).toBe("Whoops! Lost connection");
  });
});
