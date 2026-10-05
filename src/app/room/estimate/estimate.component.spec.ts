import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {NgbDropdownModule} from "@ng-bootstrap/ng-bootstrap";
import {EstimateComponent} from "./estimate.component";
import * as RoomAction from "../../store/room/room.action";
import {appState, cards, room} from "../../testing/test-data";
import {TranslatePipe} from "../../i18n/translate.pipe";
import {I18nService} from "../../i18n/i18n.service";
import {RoundDto} from "../../models/room-dto.model";

describe("EstimateComponent", () => {
  let fixture: ComponentFixture<EstimateComponent>;
  let store: MockStore;

  const revealedAt = "2026-10-05T12:00:00.000Z";
  const agreed: RoundDto = {revealedAt, votes: [{nickname: "Alex", card: "2h"}, {nickname: "Dmitry", card: "2h"}]};
  const split: RoundDto = {revealedAt, votes: [{nickname: "Alex", card: "1h"}, {nickname: "Dmitry", card: "2h"}]};

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EstimateComponent],
      imports: [TranslatePipe, NgbDropdownModule],
      providers: [provideMockStore({initialState: appState()})]
    });
    TestBed.inject(I18nService).language = "en";
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
    fixture = TestBed.createComponent(EstimateComponent);
    fixture.detectChanges();
  });

  function setState(round: RoundDto, showVotingResult: boolean = true): void {
    store.setState(appState({room: room({deck: {cards: cards("1h", "2h", "1d")}, history: [round]}), showVotingResult}));
    fixture.detectChanges();
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(".btn-group > button"));
  }

  function choose(card: string): void {
    fixture.nativeElement.querySelector(".dropdown-toggle").click();
    fixture.detectChanges();
    const choices: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll(".card-choice"));
    choices.find(choice => choice.textContent!.trim() === card)!.click();
  }

  it("is offered only while the cards of a round are revealed", () => {
    expect(buttons()).toEqual([]);

    setState(agreed, false);

    expect(buttons()).toEqual([]);
  });

  it("accepts the card most people picked with one click", () => {
    setState(agreed);

    expect(buttons()[0].textContent!.trim()).toBe("Accept 2h");
    buttons()[0].click();

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.acceptEstimate({revealedAt, card: "2h"}));
  });

  it("accepts any card of the deck instead", () => {
    setState(agreed);

    choose("1d");

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.acceptEstimate({revealedAt, card: "1d"}));
  });

  it("asks to choose a card when the votes split", () => {
    setState(split);

    expect(buttons().map(button => button.textContent!.trim())).toEqual(["Accept estimate"]);
    choose("1h");

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.acceptEstimate({revealedAt, card: "1h"}));
  });

  it("shows the accepted estimate to everyone and lets them change it", () => {
    setState({...split, estimate: "2h"});

    expect(buttons().map(button => button.textContent!.trim())).toEqual(["Estimate: 2h"]);
    choose("1d");

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.acceptEstimate({revealedAt, card: "1d"}));
    expect(fixture.nativeElement.querySelector(".card-choice.active").textContent.trim()).toBe("2h");
  });
});
