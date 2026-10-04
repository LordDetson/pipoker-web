import {TranslationKey} from "../i18n/translations";
import {AppConstants} from "./app-constants";
import {parseDeck} from "./room-validators";

// A deck offered when a room is created. Cards are written the way the deck field takes them: "1; 2; 3".
export interface NamedDeck {
  name: string;
  cards: string;
}

export interface PresetDeck {
  id: string;
  name: TranslationKey;
  cards: string;
}

export const PRESET_DECKS: PresetDeck[] = [
  {id: "fibonacci", name: "deck.fibonacci", cards: "0; 1; 2; 3; 5; 8; 13; 21; 34; 55; 89; ?; ☕"},
  {id: "storyPoints", name: "deck.storyPoints", cards: "0; ½; 1; 2; 3; 5; 8; 13; 20; 40; 100; ?; ☕"},
  {id: "time", name: "deck.time", cards: AppConstants.defaultDeck},
  {id: "tshirt", name: "deck.tshirt", cards: "XS; S; M; L; XL; XXL; ?"}
];

// Two decks are the same when they have the same cards in the same order, however they are spaced or cased:
// the server compares card values that way too.
export function sameCards(deck1: string, deck2: string): boolean {
  const cards1 = parseDeck(deck1).map(card => card.toLowerCase());
  const cards2 = parseDeck(deck2).map(card => card.toLowerCase());
  return cards1.length === cards2.length && cards1.every((card, index) => card === cards2[index]);
}

// The decks a person saved under their own names. There is no registration, so they live in this browser.
export class MyDecks {

  static load(): NamedDeck[] {
    try {
      const decks = JSON.parse(localStorage.getItem(AppConstants.myDecks) ?? "[]");
      return Array.isArray(decks)
        ? decks.filter(deck => typeof deck?.name === "string" && typeof deck?.cards === "string")
        : [];
    } catch (error) {
      return [];
    }
  }

  // A deck saved under a name that is already taken replaces the old one in its place.
  static save(deck: NamedDeck): NamedDeck[] {
    const decks = MyDecks.load();
    const index = decks.findIndex(saved => MyDecks.sameName(saved.name, deck.name));
    if (index < 0) {
      decks.push(deck);
    } else {
      decks[index] = deck;
    }
    return MyDecks.store(decks);
  }

  static remove(name: string): NamedDeck[] {
    return MyDecks.store(MyDecks.load().filter(deck => !MyDecks.sameName(deck.name, name)));
  }

  private static store(decks: NamedDeck[]): NamedDeck[] {
    localStorage.setItem(AppConstants.myDecks, JSON.stringify(decks));
    return decks;
  }

  private static sameName(name1: string, name2: string): boolean {
    return name1.trim().toLowerCase() === name2.trim().toLowerCase();
  }
}
