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

  function parts(): {label: string, grow: string, leader: boolean}[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(".part")).map(part => ({
      label: part.title,
      grow: part.style.flexGrow,
      leader: part.classList.contains("leader")
    }));
  }

  it("shows nothing until the cards are revealed", () => {
    expect(fixture.nativeElement.querySelector(".strip")).toBeNull();
  });

  it("names the leading card and splits the strip between the picked cards in the order of the deck", () => {
    reveal("1d", "1h", "1d", "2h", "1d", "1h");

    expect(text(".leading-card")).toBe("1d");
    expect(text(".detail")).toBe("picked by 3 of 6 · agreement 50%");
    expect(parts()).toEqual([
      {label: "1h: 2", grow: "2", leader: false},
      {label: "2h: 1", grow: "1", leader: false},
      {label: "1d: 3", grow: "3", leader: true}
    ]);
    expect(text(".spread")).toBe("Spread 1h – 1d");
  });

  it("says when everyone picked the same card", () => {
    reveal("4h", "4h", "4h");

    expect(text(".leading-card")).toBe("4h");
    expect(text(".detail")).toBe("everyone picked it");
    expect(parts()).toEqual([{label: "4h: 3", grow: "3", leader: true}]);
    expect(text(".spread")).withContext("there is no spread").toBeUndefined();
  });

  it("highlights every card that shares the most votes when the votes split", () => {
    reveal("1h", "1d", "2h", "1d", "1h");

    expect(text(".leading-card")).toBeUndefined();
    expect(text(".headline")).toBe("Votes split · 2 each for 1h, 1d");
    expect(parts().filter(part => part.leader).map(part => part.label)).toEqual(["1h: 2", "1d: 2"]);
  });

  it("speaks Russian", () => {
    TestBed.inject(I18nService).language = "ru";
    reveal("1d", "1h", "1d");

    expect(text(".detail")).toBe("выбрали 2 из 3 · согласие 67%");
    expect(text(".spread")).toBe("Разброс 1h – 1d");
  });
});
