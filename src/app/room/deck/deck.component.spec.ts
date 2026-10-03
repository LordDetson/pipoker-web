import {ComponentFixture, TestBed} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {DeckComponent} from "./deck.component";
import {appState, cards, participant, room} from "../../testing/test-data";

describe("DeckComponent", () => {
  let fixture: ComponentFixture<DeckComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DeckComponent],
      providers: [provideMockStore({initialState: appState({room: room({deck: {cards: cards("S", "M", "L")}})})})],
      schemas: [NO_ERRORS_SCHEMA]
    });
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(DeckComponent);
    fixture.detectChanges();
  });

  function deckCards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll("app-deck-card"));
  }

  it("shows a card for every card of the deck to a voter", () => {
    expect(deckCards().length).toBe(3);
  });

  it("hides the deck from a watcher", () => {
    store.setState(appState({room: room({deck: {cards: cards("S", "M", "L")}})}, {currentParticipant: participant("Dmitry", true)}));
    fixture.detectChanges();

    expect(deckCards().length).toBe(0);
  });
});
