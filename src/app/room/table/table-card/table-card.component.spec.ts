import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {TableCardComponent} from "./table-card.component";
import {appState, participant, room, votes} from "../../../testing/test-data";
import {Participant} from "../../../models/participant.model";

describe("TableCardComponent", () => {
  let fixture: ComponentFixture<TableCardComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TableCardComponent],
      providers: [provideMockStore({initialState: appState()})]
    });
    store = TestBed.inject(MockStore);
  });

  function create(shown: Participant, votesByNickname: { [nickname: string]: string } = {}, showVotingResult = false): void {
    store.setState(appState({room: room({votingResult: {map: votes(votesByNickname)}}), showVotingResult}));
    fixture = TestBed.createComponent(TableCardComponent);
    fixture.componentInstance.participant = shown;
    fixture.detectChanges();
  }

  function card(): HTMLElement {
    return fixture.nativeElement.querySelector(".playing-card");
  }

  function value(): HTMLElement | null {
    return fixture.nativeElement.querySelector(".card-face .card-value");
  }

  function visibility(side: string): string {
    return getComputedStyle(fixture.nativeElement.querySelector(side)).visibility;
  }

  it("shows the nickname under an empty place until the participant votes", () => {
    create(participant("Dmitry"));

    const nickname: HTMLElement = fixture.nativeElement.querySelector(".nickname");
    expect(nickname.textContent).toBe("Dmitry");
    expect(nickname.title).withContext("a long nickname is cut, the whole one is in the tooltip").toBe("Dmitry");
    expect(card().classList).not.toContain("voted");
  });

  it("hides the card value until the votes are revealed", () => {
    create(participant("Dmitry"), {Dmitry: "1d"});

    expect(card().classList).toContain("voted");
    expect(card().classList).not.toContain("turned");
    expect(value()).toBeNull();
  });

  it("turns the card over when the votes are revealed", () => {
    create(participant("Dmitry"), {Dmitry: "1d"}, true);

    expect(card().classList).toContain("turned");
    expect(value()!.textContent).toBe("1d");
  });

  it("gives longer values a smaller font", () => {
    create(participant("Dmitry"), {Dmitry: "100500"}, true);

    expect(value()!.style.getPropertyValue("--value-length")).toBe("6");
  });

  it("shows only the side of the card that is turned to the viewer", () => {
    create(participant("Dmitry"), {Dmitry: "1d"});

    expect(visibility(".card-back")).toBe("visible");
    expect(visibility(".card-face")).toBe("hidden");
  });

  it("hides the back of a turned card, which browsers would otherwise show mirrored", () => {
    create(participant("Dmitry"), {Dmitry: "1d"}, true);

    expect(visibility(".card-back")).toBe("hidden");
    expect(visibility(".card-face")).toBe("visible");
  });

  it("does not turn over the card of a participant who did not vote", () => {
    create(participant("Alex"), {Dmitry: "1d"}, true);

    expect(card().classList).not.toContain("turned");
    expect(value()).toBeNull();
  });

  it("turns the card over after the cards of lower votes", () => {
    create(participant("Dmitry"), {Dmitry: "1d", Alex: "1h"}, true);

    expect(card().style.getPropertyValue("--flip-delay")).toBe("0.3s");
    expect(getComputedStyle(card()).transitionDelay).toBe("0.3s");
  });

  it("has no delay while the votes are hidden, so all cards turn back for a new round at once", () => {
    create(participant("Dmitry"), {Dmitry: "1d", Alex: "1h"});

    expect(card().style.getPropertyValue("--flip-delay")).toBe("0s");
  });
});
