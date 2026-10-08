import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {VotingResultComponent} from "./voting-result.component";
import {appState, cards, room} from "../../testing/test-data";
import {TranslatePipe} from "../../i18n/translate.pipe";
import {I18nService} from "../../i18n/i18n.service";

describe("VotingResultComponent", () => {
  let fixture: ComponentFixture<VotingResultComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VotingResultComponent],
      imports: [TranslatePipe],
      providers: [provideMockStore({initialState: appState()})]
    });
    TestBed.inject(I18nService).language = "en";
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(VotingResultComponent);
    fixture.detectChanges();
  });

  // Reveals a round with the given votes, one per participant, in a room with the deck 1h, 2h, 4h, 1d
  function reveal(...votes: string[]): void {
    store.setState(appState({
      room: room({
        deck: {cards: cards("1h", "2h", "4h", "1d")},
        history: [{
          revealedAt: "2026-10-07T12:00:00.000Z",
          votes: votes.map((card, index) => ({nickname: "Person " + index, card}))
        }]
      }),
      showVotingResult: true
    }));
    fixture.detectChanges();
  }

  function text(selector: string): string | undefined {
    return fixture.nativeElement.querySelector(selector)?.textContent.replace(/\s+/g, " ").trim();
  }

  function piles(): {label: string, cards: number, count: string, leader: boolean}[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(".pile")).map(pile => ({
      label: pile.title,
      cards: pile.querySelectorAll(".pile-card").length,
      count: pile.querySelector(".count")!.textContent!.trim(),
      leader: pile.classList.contains("leader")
    }));
  }

  it("shows nothing until the cards are revealed", () => {
    expect(fixture.nativeElement.querySelector(".piles")).toBeNull();
  });

  it("keeps the round while it sinks away at the start of the next round", () => {
    reveal("1h", "4h");

    store.setState(appState({room: room({deck: {cards: cards("1h", "2h", "4h", "1d")}}), showVotingResult: false}));
    fixture.detectChanges();

    expect(piles().map(pile => pile.label)).toEqual(["1h: 1", "4h: 1"]);
  });

  it("names the leading card and piles the picked cards in the order of the deck", () => {
    reveal("1d", "1h", "1d", "2h", "1d", "1h");

    expect(text(".leading-card")).toBe("1d");
    expect(text(".detail")).toBe("picked by 3 of 6 · agreement 50%");
    expect(piles()).toEqual([
      {label: "1h: 2", cards: 2, count: "×2", leader: false},
      {label: "2h: 1", cards: 1, count: "×1", leader: false},
      {label: "1d: 3", cards: 3, count: "×3", leader: true}
    ]);
    expect(text(".spread")).toBe("Spread 1h – 1d");
  });

  it("says when everyone picked the same card", () => {
    reveal("4h", "4h", "4h");

    expect(text(".leading-card")).toBe("4h");
    expect(text(".detail")).toBe("everyone picked it");
    expect(piles()).toEqual([{label: "4h: 3", cards: 3, count: "×3", leader: true}]);
    expect(text(".spread")).withContext("there is no spread").toBeUndefined();
  });

  it("highlights every card that shares the most votes when the votes split", () => {
    reveal("1h", "1d", "2h", "1d", "1h");

    expect(text(".leading-card")).toBeUndefined();
    expect(text(".headline")).toBe("Votes split · 2 each for 1h, 1d");
    expect(piles().filter(pile => pile.leader).map(pile => pile.label)).toEqual(["1h: 2", "1d: 2"]);
  });

  it("piles up to four cards and counts the rest", () => {
    reveal("2h", "2h", "2h", "2h", "2h", "2h", "1h");

    expect(piles()[1]).toEqual({label: "2h: 6", cards: 4, count: "×6", leader: true});
  });

  it("speaks Russian", () => {
    TestBed.inject(I18nService).language = "ru";
    reveal("1d", "1h", "1d");

    expect(text(".detail")).toBe("выбрали 2 из 3 · согласие 67%");
    expect(text(".spread")).toBe("Разброс 1h – 1d");
  });
});
