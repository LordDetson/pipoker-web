import {fakeAsync, TestBed, tick} from "@angular/core/testing";
import {provideMockActions} from "@ngrx/effects/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {Action} from "@ngrx/store";
import {NEVER, Observable, of, ReplaySubject, throwError} from "rxjs";
import {ParticipantEffect, RETURN_TIMEOUT} from "./participant.effect";
import * as ParticipantAction from "./participant.action";
import * as RoomAction from "../room/room.action";
import {RoomService} from "../../services/room.service";
import {appState, participant, room, ROOM_ID} from "../../testing/test-data";
import {SeatStorage} from "../../common/seat-storage";
import {AppConstants} from "../../common/app-constants";

describe("ParticipantEffect", () => {
  let actions$: ReplaySubject<Action>;
  let effects: ParticipantEffect;
  let store: MockStore;
  let roomService: jasmine.SpyObj<RoomService>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    actions$ = new ReplaySubject<Action>();
    roomService = jasmine.createSpyObj<RoomService>("RoomService", ["returnParticipant", "get"]);
    TestBed.configureTestingModule({
      providers: [
        ParticipantEffect,
        provideMockActions(() => actions$),
        provideMockStore({initialState: appState({}, {currentParticipant: participant("Alex")})}),
        {provide: RoomService, useValue: roomService}
      ]
    });
    effects = TestBed.inject(ParticipantEffect);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function collect<T>(effect$: Observable<T>): T[] {
    const actions: T[] = [];
    effect$.subscribe(action => actions.push(action));
    return actions;
  }

  it("removes the current participant from the room when they leave", () => {
    SeatStorage.save(ROOM_ID, participant("Alex"));
    const dispatched = spyOn(store, "dispatch");
    actions$.next(ParticipantAction.destroy());

    const actions = collect(effects.destroy$);

    expect(dispatched).toHaveBeenCalledWith(RoomAction.removeParticipant({roomId: ROOM_ID, participant: participant("Alex")}));
    expect(actions).toEqual([ParticipantAction.destroySuccess()]);
    expect(SeatStorage.find(ROOM_ID)).withContext("nothing to return to after leaving on purpose").toBeUndefined();
  });

  it("has nobody to remove when the page is left without joining", () => {
    store.setState(appState({}, {currentParticipant: undefined}));
    const dispatched = spyOn(store, "dispatch");
    actions$.next(ParticipantAction.destroy());

    const actions = collect(effects.destroy$);

    expect(dispatched).not.toHaveBeenCalled();
    expect(actions).toEqual([ParticipantAction.destroySuccess()]);
  });

  it("remembers the seat of this tab once the participant has joined", () => {
    actions$.next(ParticipantAction.initSuccess({participant: participant("Kate", true)}));

    effects.rememberSeat$.subscribe();

    expect(SeatStorage.find(ROOM_ID)).toEqual(participant("Kate", true));
  });

  describe("returnToSeat$", () => {
    it("takes the seat back and loads the room with the participant's vote", () => {
      const current = room({participants: [participant("Dmitry"), participant("Alex")]});
      roomService.returnParticipant.and.returnValue(of(participant("Alex")));
      roomService.get.and.returnValue(of(current));
      actions$.next(ParticipantAction.returnToSeat({roomId: ROOM_ID, participant: participant("alex")}));

      expect(collect(effects.returnToSeat$)).toEqual([
        ParticipantAction.initSuccess({participant: participant("Alex")}),
        RoomAction.refreshSuccess({room: current})
      ]);
      expect(roomService.returnParticipant).toHaveBeenCalledWith(ROOM_ID, participant("alex"));
    });

    it("asks for the nickname when the participant has left the room meanwhile", () => {
      roomService.returnParticipant.and.returnValue(throwError(() => ({message: "Participant \"Alex\" is not in the room"})));
      actions$.next(ParticipantAction.returnToSeat({roomId: ROOM_ID, participant: participant("Alex", true)}));

      expect(collect(effects.returnToSeat$)).toEqual([
        ParticipantAction.seatLost({roomId: ROOM_ID, participant: participant("Alex", true)})
      ]);
      expect(roomService.get).not.toHaveBeenCalled();
    });

    it("stops waiting for a server that does not answer", fakeAsync(() => {
      roomService.returnParticipant.and.returnValue(NEVER);
      actions$.next(ParticipantAction.returnToSeat({roomId: ROOM_ID, participant: participant("Alex")}));
      const actions = collect(effects.returnToSeat$);

      tick(RETURN_TIMEOUT);

      expect(actions).toEqual([ParticipantAction.seatLost({roomId: ROOM_ID, participant: participant("Alex")})]);
    }));

    it("reports a room that is gone after returning", () => {
      const error = new Error("boom");
      roomService.returnParticipant.and.returnValue(of(participant("Alex")));
      roomService.get.and.returnValue(throwError(() => error));
      actions$.next(ParticipantAction.returnToSeat({roomId: ROOM_ID, participant: participant("Alex")}));

      expect(collect(effects.returnToSeat$)).toEqual([
        ParticipantAction.initSuccess({participant: participant("Alex")}),
        RoomAction.initFailure({error})
      ]);
    });
  });

  it("forgets the seat and offers the same nickname and role to join again", () => {
    SeatStorage.save(ROOM_ID, participant("Alex", true));
    localStorage.setItem(AppConstants.lastNickname, "Someone else");
    actions$.next(ParticipantAction.seatLost({roomId: ROOM_ID, participant: participant("Alex", true)}));

    effects.forgetSeat$.subscribe();

    expect(SeatStorage.find(ROOM_ID)).toBeUndefined();
    expect(localStorage.getItem(AppConstants.lastNickname)).toBe("Alex");
    expect(localStorage.getItem(AppConstants.lastWatcher)).toBe("true");
  });

  describe("removedByServer$", () => {
    it("asks for the nickname again when the server removed this participant", () => {
      actions$.next(RoomAction.removeParticipantSuccess({participant: participant("alex")}));

      expect(collect(effects.removedByServer$)).toEqual([
        ParticipantAction.seatLost({roomId: ROOM_ID, participant: participant("Alex")})
      ]);
    });

    it("ignores other people leaving and removals after leaving on purpose", () => {
      actions$.next(RoomAction.removeParticipantSuccess({participant: participant("Dmitry")}));
      const actions = collect(effects.removedByServer$);
      store.setState(appState({}, {currentParticipant: undefined}));
      actions$.next(RoomAction.removeParticipantSuccess({participant: participant("Alex")}));

      expect(actions).toEqual([]);
    });
  });
});
