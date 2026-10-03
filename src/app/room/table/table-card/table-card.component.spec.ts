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
    return fixture.nativeElement.querySelector(".card");
  }

  function backValue(): string | undefined {
    return fixture.nativeElement.querySelector(".card-body-back .card-text")?.textContent.trim();
  }

  it("shows the nickname of a participant who has not voted", () => {
    create(participant("Dmitry"));

    expect(fixture.nativeElement.querySelector(".card-title").textContent).toBe("Dmitry");
    expect(card().classList).toContain("bg-body-secondary");
    expect(card().classList).not.toContain("voted");
    expect(fixture.nativeElement.querySelector(".eye-icon")).toBeNull();
  });

  it("marks a watcher", () => {
    create(participant("Alex", true));

    expect(fixture.nativeElement.querySelector(".eye-icon")).not.toBeNull();
  });

  it("hides the card value until the votes are revealed", () => {
    create(participant("Dmitry"), {Dmitry: "1d"});

    expect(card().classList).toContain("voted");
    expect(card().classList).not.toContain("rotateY180");
    expect(backValue()).toBeUndefined();
  });

  it("turns the card over when the votes are revealed", () => {
    create(participant("Dmitry"), {Dmitry: "1d"}, true);

    expect(card().classList).toContain("rotateY180");
    expect(backValue()).toBe("1d");
  });

  it("does not turn over the card of a participant who did not vote", () => {
    create(participant("Alex"), {Dmitry: "1d"}, true);

    expect(card().classList).not.toContain("rotateY180");
    expect(backValue()).toBeUndefined();
  });
});
