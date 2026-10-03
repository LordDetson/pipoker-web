import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {ButtonsComponent} from "./buttons.component";
import * as RoomAction from "../../store/room/room.action";
import {appState, room, votes} from "../../testing/test-data";

describe("ButtonsComponent", () => {
  let fixture: ComponentFixture<ButtonsComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ButtonsComponent],
      providers: [provideMockStore({initialState: appState()})]
    });
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
    fixture = TestBed.createComponent(ButtonsComponent);
    fixture.detectChanges();
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector("#mainBtn");
  }

  function setState(votesByNickname: { [nickname: string]: string }, showVotingResult: boolean): void {
    store.setState(appState({room: room({votingResult: {map: votes(votesByNickname)}}), showVotingResult}));
    fixture.detectChanges();
  }

  it("waits for the first vote", () => {
    expect(button().textContent!.trim()).toBe("Voting...");
    expect(button().disabled).toBeTrue();

    fixture.componentInstance.mainBtnClick();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("reveals the cards once someone voted", () => {
    setState({Dmitry: "1h"}, false);

    expect(button().textContent!.trim()).toBe("Reveal Cards");
    expect(button().classList).toContain("btn-primary");
    button().click();

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.showVotingResult());
  });

  it("starts a new voting after the cards are revealed", () => {
    setState({Dmitry: "1h"}, true);

    expect(button().textContent!.trim()).toBe("Start New Voting");
    button().click();

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.startNewVoting());
  });
});
