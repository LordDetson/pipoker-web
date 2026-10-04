import {AppConstants} from "./app-constants";
import {MyDecks, PRESET_DECKS, sameCards} from "./decks";
import {RoomValidators} from "./room-validators";
import {FormControl} from "@angular/forms";

describe("decks", () => {

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("offers only preset decks the server accepts", () => {
    PRESET_DECKS.forEach(deck => expect(RoomValidators.deck(new FormControl(deck.cards))).withContext(deck.id).toBeNull());
  });

  it("compares decks by their cards in order, ignoring spaces and case", () => {
    expect(sameCards("S; M; L", " s ;m;;L ")).toBeTrue();
    expect(sameCards("S; M; L", "S; L; M")).toBeFalse();
    expect(sameCards("S; M; L", "S; M")).toBeFalse();
  });

  it("keeps saved decks in the browser and replaces one saved under a taken name", () => {
    MyDecks.save({name: "Team", cards: "1; 2"});
    MyDecks.save({name: "Hours", cards: "1h; 2h"});
    MyDecks.save({name: " team ", cards: "1; 2; 3"});

    expect(MyDecks.load()).toEqual([{name: " team ", cards: "1; 2; 3"}, {name: "Hours", cards: "1h; 2h"}]);
    expect(MyDecks.remove("TEAM")).toEqual([{name: "Hours", cards: "1h; 2h"}]);
    expect(MyDecks.load()).toEqual([{name: "Hours", cards: "1h; 2h"}]);
  });

  it("ignores saved decks it cannot read", () => {
    localStorage.setItem(AppConstants.myDecks, "not json");
    expect(MyDecks.load()).toEqual([]);

    localStorage.setItem(AppConstants.myDecks, JSON.stringify([{name: "Ok", cards: "1"}, {name: 5}, null]));
    expect(MyDecks.load()).toEqual([{name: "Ok", cards: "1"}]);
  });
});
