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
  });

  // Cards 50px wide with 10px between them: n cards take 60 * n - 10 pixels between the deck's paddings
  function create(widthInCards: number): void {
    const host: HTMLElement = fixture.nativeElement;
    host.style.setProperty("--deck-card-width", "50px");
    host.style.setProperty("--deck-gap", "10px");
    host.style.padding = "0 7px";
    // Like Bootstrap sets it on the page
    host.style.boxSizing = "border-box";
    host.style.width = (60 * widthInCards - 10 + 14) + "px";
    fixture.detectChanges();
  }

  function deckCards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll("app-deck-card"));
  }

  function rows(): number[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(".deck-row"))
      .map(row => row.querySelectorAll("app-deck-card").length);
  }

  it("shows a card for every card of the deck to a voter", () => {
    create(10);

    expect(deckCards().length).toBe(3);
  });

  it("hides the deck from a watcher", () => {
    store.setState(appState({room: room({deck: {cards: cards("S", "M", "L")}})}, {currentParticipant: participant("Dmitry", true)}));
    create(10);

    expect(deckCards().length).toBe(0);
  });

  it("keeps the deck in one row while it fits", () => {
    create(3);

    expect(rows()).toEqual([3]);
  });

  it("splits the deck into rows that fit, with the extra card in the first row", () => {
    create(2.9);

    expect(rows()).toEqual([2, 1]);
  });

  it("lays the deck out again when the window is resized", () => {
    create(3);

    fixture.nativeElement.style.width = "50px";
    window.dispatchEvent(new Event("resize"));
    fixture.detectChanges();

    expect(rows()).toEqual([1, 1, 1]);
  });

  it("gathers every card in the middle of the deck and deals them back out", () => {
    create(3);
    const host: HTMLElement = fixture.nativeElement;
    host.style.display = "block";
    deckCards().forEach(card => card.style.display = "block");
    const middle = host.getBoundingClientRect().left + host.getBoundingClientRect().width / 2;
    const places = deckCards().map(card => card.getBoundingClientRect());

    fixture.componentRef.setInput("gathering", true);
    fixture.detectChanges();

    expect(host.classList).toContain("gathering");
    deckCards().forEach((card, index) => {
      expect(places[index].left + places[index].width / 2 + parseFloat(card.style.getPropertyValue("--gather-x")))
        .toBeCloseTo(middle, 0);
    });

    fixture.componentRef.setInput("gathering", false);
    fixture.detectChanges();

    expect(host.classList).not.toContain("gathering");
  });
});
