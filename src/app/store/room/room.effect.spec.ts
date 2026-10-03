import {TestBed} from "@angular/core/testing";
import {provideMockActions} from "@ngrx/effects/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {Action} from "@ngrx/store";
import {Router} from "@angular/router";
import {Observable, of, ReplaySubject, Subject, throwError} from "rxjs";
import {RoomEffect} from "./room.effect";
import * as RoomAction from "./room.action";
import * as ParticipantAction from "../participant/participant.action";
import {RoomService} from "../../services/room.service";
import {RoomWebSocketService} from "../../services/room-web-socket.service";
import {appState, cards, participant, room, ROOM_ID} from "../../testing/test-data";
import {CurrentParticipantStatus} from "../participant/current-participant-state";
import {SeatStorage} from "../../common/seat-storage";

describe("RoomEffect", () => {
  let actions$: ReplaySubject<Action>;
  let effects: RoomEffect;
  let roomService: jasmine.SpyObj<RoomService>;
  let webSocket: jasmine.SpyObj<RoomWebSocketService>;
  let reconnected$: Subject<void>;
  let router: jasmine.SpyObj<Router>;
  let store: MockStore;

  const createRoomInfo = {nickname: " alex ", roomName: "Sprint", deck: {cards: cards("1h")}, watcher: false};
  const error = new Error("boom");

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>();
    roomService = jasmine.createSpyObj<RoomService>("RoomService",
      ["create", "get", "addParticipant", "removeParticipant", "returnParticipant", "vote", "clearVotingResult", "showVotingResult"]);
    reconnected$ = new Subject<void>();
    webSocket = jasmine.createSpyObj<RoomWebSocketService>("RoomWebSocketService", ["connect"], {reconnected$});
    router = jasmine.createSpyObj<Router>("Router", ["navigate"]);
    TestBed.configureTestingModule({
      providers: [
        RoomEffect,
        provideMockActions(() => actions$),
        provideMockStore({initialState: appState()}),
        {provide: RoomService, useValue: roomService},
        {provide: RoomWebSocketService, useValue: webSocket},
        {provide: Router, useValue: router}
      ]
    });
    effects = TestBed.inject(RoomEffect);
    store = TestBed.inject(MockStore);
  });

  function collect<T>(effect$: Observable<T>): T[] {
    const actions: T[] = [];
    effect$.subscribe(action => actions.push(action));
    return actions;
  }

  describe("refreshAfterReconnect$", () => {
    afterEach(() => sessionStorage.clear());

    it("takes the seat back and loads the room again when the connection is back", () => {
      const fresh = room({participants: [participant("Dmitry"), participant("Carol")]});
      roomService.returnParticipant.and.returnValue(of(participant("Dmitry")));
      roomService.get.and.returnValue(of(fresh));
      const actions = collect(effects.refreshAfterReconnect$);

      reconnected$.next();

      expect(roomService.returnParticipant).toHaveBeenCalledWith(ROOM_ID, participant("Dmitry"));
      expect(roomService.get).toHaveBeenCalledWith(ROOM_ID);
      expect(actions).toEqual([RoomAction.refreshSuccess({room: fresh})]);
    });

    it("asks for the nickname again when the participant has left the room meanwhile", () => {
      const fresh = room({participants: [participant("Carol")]});
      roomService.returnParticipant.and.returnValue(throwError(() => ({message: "Participant \"Dmitry\" is not in the room"})));
      roomService.get.and.returnValue(of(fresh));
      const actions = collect(effects.refreshAfterReconnect$);

      reconnected$.next();

      expect(actions).toEqual([
        ParticipantAction.seatLost({roomId: ROOM_ID, participant: participant("Dmitry")}),
        RoomAction.refreshSuccess({room: fresh})
      ]);
    });

    it("only loads the room when nobody has joined from this tab", () => {
      store.setState(appState({}, {currentParticipant: undefined}));
      roomService.get.and.returnValue(of(room()));
      const actions = collect(effects.refreshAfterReconnect$);

      reconnected$.next();

      expect(roomService.returnParticipant).not.toHaveBeenCalled();
      expect(actions).toEqual([RoomAction.refreshSuccess({room: room()})]);
    });

    it("tries to return to the seat again when the answer was lost with the connection", () => {
      SeatStorage.save(ROOM_ID, participant("Alex"));
      store.setState(appState({}, {currentParticipant: undefined, status: CurrentParticipantStatus.returning}));
      const actions = collect(effects.refreshAfterReconnect$);

      reconnected$.next();

      expect(actions).toEqual([ParticipantAction.returnToSeat({roomId: ROOM_ID, participant: participant("Alex")})]);
      expect(roomService.get).not.toHaveBeenCalled();
    });

    it("reports a room that is gone", () => {
      store.setState(appState({}, {currentParticipant: undefined}));
      roomService.get.and.returnValue(throwError(() => error));
      const actions = collect(effects.refreshAfterReconnect$);

      reconnected$.next();

      expect(actions).toEqual([RoomAction.initFailure({error})]);
    });

    it("does nothing before a room is opened", () => {
      store.setState(appState({room: room({id: ""})}));
      const actions = collect(effects.refreshAfterReconnect$);

      reconnected$.next();

      expect(roomService.get).not.toHaveBeenCalled();
      expect(actions).toEqual([]);
    });
  });

  describe("createRoom$", () => {
    it("initializes the room and the participant that created it", () => {
      const created = room({participants: [participant("Dmitry"), participant("Alex")]});
      roomService.create.and.returnValue(of(created));
      actions$.next(RoomAction.create({createRoomInfo}));

      expect(collect(effects.createRoom$)).toEqual([
        RoomAction.initSuccess({room: created}),
        ParticipantAction.initSuccess({participant: participant("Alex")})
      ]);
      expect(roomService.create).toHaveBeenCalledWith(createRoomInfo);
    });

    it("falls back to the first participant when the nickname is not found", () => {
      const created = room({participants: [participant("Dmitry")]});
      roomService.create.and.returnValue(of(created));
      actions$.next(RoomAction.create({createRoomInfo}));

      expect(collect(effects.createRoom$)[1]).toEqual(ParticipantAction.initSuccess({participant: participant("Dmitry")}));
    });

    it("reports a failure to both the room and the participant", () => {
      roomService.create.and.returnValue(throwError(() => error));
      actions$.next(RoomAction.create({createRoomInfo}));

      expect(collect(effects.createRoom$)).toEqual([
        RoomAction.initFailure({error}),
        ParticipantAction.initFailure({error})
      ]);
    });
  });

  it("starts the participant initialization when a room is created or joined", () => {
    actions$.next(RoomAction.create({createRoomInfo}));
    actions$.next(RoomAction.addParticipant({roomId: ROOM_ID, participant: participant("Alex")}));
    actions$.next(RoomAction.get({roomId: ROOM_ID}));

    expect(collect(effects.dispatchParticipantInit)).toEqual([ParticipantAction.init(), ParticipantAction.init()]);
  });

  it("navigates to the loaded room and listens to its events", () => {
    actions$.next(RoomAction.initSuccess({room: room()}));

    collect(effects.navigateToRoom$);
    collect(effects.connectWebSocket$);

    expect(router.navigate).toHaveBeenCalledWith(["room", ROOM_ID]);
    expect(webSocket.connect).toHaveBeenCalledWith(ROOM_ID);
  });

  describe("getRoom$", () => {
    it("loads the room", () => {
      const loaded = room();
      roomService.get.and.returnValue(of(loaded));
      actions$.next(RoomAction.get({roomId: ROOM_ID}));

      expect(collect(effects.getRoom$)).toEqual([RoomAction.initSuccess({room: loaded})]);
      expect(roomService.get).toHaveBeenCalledWith(ROOM_ID);
    });

    it("reports a failure", () => {
      roomService.get.and.returnValue(throwError(() => error));
      actions$.next(RoomAction.get({roomId: ROOM_ID}));

      expect(collect(effects.getRoom$)).toEqual([RoomAction.initFailure({error})]);
    });
  });

  describe("addParticipant$", () => {
    it("initializes the joined participant", () => {
      roomService.addParticipant.and.returnValue(of(participant("Alex", true)));
      actions$.next(RoomAction.addParticipant({roomId: ROOM_ID, participant: participant("Alex", true)}));

      expect(collect(effects.addParticipant$)).toEqual([ParticipantAction.initSuccess({participant: participant("Alex", true)})]);
      expect(roomService.addParticipant).toHaveBeenCalledWith(ROOM_ID, participant("Alex", true));
    });

    it("reports a failure", () => {
      roomService.addParticipant.and.returnValue(throwError(() => error));
      actions$.next(RoomAction.addParticipant({roomId: ROOM_ID, participant: participant("Alex")}));

      expect(collect(effects.addParticipant$)).toEqual([
        ParticipantAction.initFailure({error}),
        RoomAction.addParticipantFailure({error})
      ]);
    });
  });

  describe("removeParticipant$", () => {
    it("leaves the room", () => {
      roomService.removeParticipant.and.returnValue(of(participant("Alex")));
      actions$.next(RoomAction.removeParticipant({roomId: ROOM_ID, participant: participant("Alex")}));

      expect(collect(effects.removeParticipant$)).toEqual([RoomAction.doNothing()]);
      expect(roomService.removeParticipant).toHaveBeenCalledWith(ROOM_ID, participant("Alex"));
    });

    it("reports a failure", () => {
      roomService.removeParticipant.and.returnValue(throwError(() => error));
      actions$.next(RoomAction.removeParticipant({roomId: ROOM_ID, participant: participant("Alex")}));

      expect(collect(effects.removeParticipant$)).toEqual([RoomAction.removeParticipantFailure({error})]);
    });
  });

  describe("selectCard$", () => {
    it("votes in the current room and remembers the selected card", () => {
      roomService.vote.and.returnValue(of({participant: participant("Dmitry"), card: {value: "1d"}}));
      actions$.next(RoomAction.selectCard({participant: participant("Dmitry"), card: {value: "1d"}}));

      expect(collect(effects.selectCard$)).toEqual([ParticipantAction.initSelectedCurdSuccess({card: {value: "1d"}})]);
      expect(roomService.vote).toHaveBeenCalledWith(ROOM_ID, participant("Dmitry"), {value: "1d"});
    });

    it("reports a failure", () => {
      roomService.vote.and.returnValue(throwError(() => error));
      actions$.next(RoomAction.selectCard({participant: participant("Dmitry"), card: {value: "1d"}}));

      expect(collect(effects.selectCard$)).toEqual([
        RoomAction.cardSelectionFailure({error}),
        ParticipantAction.initSelectedCurdFailure({error})
      ]);
    });
  });

  it("reveals the votes of the current room", () => {
    store.setState(appState({room: room({id: "room-2"})}));
    actions$.next(RoomAction.showVotingResult());

    collect(effects.showVotingResult$);

    expect(roomService.showVotingResult).toHaveBeenCalledWith("room-2");
  });

  describe("startNewVoting$", () => {
    it("clears the votes of the current room", () => {
      roomService.clearVotingResult.and.returnValue(of(undefined));
      actions$.next(RoomAction.startNewVoting());

      expect(collect(effects.startNewVoting$)).toEqual([ParticipantAction.doNothing()]);
      expect(roomService.clearVotingResult).toHaveBeenCalledWith(ROOM_ID);
    });

    it("reports a failure", () => {
      roomService.clearVotingResult.and.returnValue(throwError(() => error));
      actions$.next(RoomAction.startNewVoting());

      expect(collect(effects.startNewVoting$)).toEqual([
        RoomAction.startNewVotingFailure({error}),
        ParticipantAction.destroySelectedCurdFailure({error})
      ]);
    });
  });

  it("forgets the selected card when a new voting starts", () => {
    actions$.next(RoomAction.startNewVotingSuccess());

    expect(collect(effects.dispatchDestroySelectedCurdSuccess$)).toEqual([ParticipantAction.destroySelectedCurdSuccess()]);
  });
});
