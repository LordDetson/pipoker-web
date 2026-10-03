import {TestBed} from "@angular/core/testing";
import {provideMockActions} from "@ngrx/effects/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {Action} from "@ngrx/store";
import {ReplaySubject} from "rxjs";
import {ParticipantEffect} from "./participant.effect";
import * as ParticipantAction from "./participant.action";
import * as RoomAction from "../room/room.action";
import {RoomService} from "../../services/room.service";
import {appState, participant, ROOM_ID} from "../../testing/test-data";

describe("ParticipantEffect", () => {
  let actions$: ReplaySubject<Action>;
  let effects: ParticipantEffect;
  let store: MockStore;

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    TestBed.configureTestingModule({
      providers: [
        ParticipantEffect,
        provideMockActions(() => actions$),
        provideMockStore({initialState: appState({}, {currentParticipant: participant("Alex")})}),
        {provide: RoomService, useValue: {}}
      ]
    });
    effects = TestBed.inject(ParticipantEffect);
    store = TestBed.inject(MockStore);
  });

  it("removes the current participant from the room when they leave", () => {
    const dispatched = spyOn(store, "dispatch");
    const actions: Action[] = [];
    actions$.next(ParticipantAction.destroy());

    effects.destroy$.subscribe(action => actions.push(action));

    expect(dispatched).toHaveBeenCalledWith(RoomAction.removeParticipant({roomId: ROOM_ID, participant: participant("Alex")}));
    expect(actions).toEqual([ParticipantAction.destroySuccess()]);
  });

  it("has nobody to remove when the page is left without joining", () => {
    store.setState(appState({}, {currentParticipant: undefined}));
    const dispatched = spyOn(store, "dispatch");
    const actions: Action[] = [];
    actions$.next(ParticipantAction.destroy());

    effects.destroy$.subscribe(action => actions.push(action));

    expect(dispatched).not.toHaveBeenCalled();
    expect(actions).toEqual([ParticipantAction.destroySuccess()]);
  });
});
