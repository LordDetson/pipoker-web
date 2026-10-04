import {roomReducer} from "./room.reducer";
import * as RoomAction from "./room.action";
import {RoomStatus} from "./room-state";
import {ErrorCode} from "../../models/room-event";
import {cards, participant, room, roomState, votes} from "../../testing/test-data";

describe("roomReducer", () => {

  it("starts with an empty pending room", () => {
    const state = roomReducer(undefined, {type: "@@init"});

    expect(state.status).toBe(RoomStatus.pending);
    expect(state.showVotingResult).toBeFalse();
    expect(state.room.id).toBe("");
    expect(state.room.participants).toEqual([]);
    expect(state.room.votingResult.map.size).toBe(0);
  });

  it("is loading while a room is created or fetched", () => {
    const pending = roomState({status: RoomStatus.pending});

    expect(roomReducer(pending, RoomAction.create({
      createRoomInfo: {nickname: "Dmitry", roomName: "Sprint", deck: {cards: cards("1h")}, watcher: false}
    })).status).toBe(RoomStatus.loading);
    expect(roomReducer(pending, RoomAction.get({roomId: "id"})).status).toBe(RoomStatus.loading);
  });

  it("stores the loaded room", () => {
    const loaded = room({name: "Planning"});

    const state = roomReducer(roomState({status: RoomStatus.loading}), RoomAction.initSuccess({room: loaded}));

    expect(state.room).toBe(loaded);
    expect(state.status).toBe(RoomStatus.success);
  });

  it("shows the cards of a loaded room that are already revealed", () => {
    expect(roomReducer(roomState(), RoomAction.initSuccess({room: room({votesShown: true})})).showVotingResult).toBeTrue();
    expect(roomReducer(roomState({showVotingResult: true}), RoomAction.initSuccess({room: room()})).showVotingResult).toBeFalse();
  });

  it("replaces the room with the one loaded after a reconnect", () => {
    const fresh = room({participants: [participant("Dmitry"), participant("Alex")], votesShown: true});

    const state = roomReducer(roomState(), RoomAction.refreshSuccess({room: fresh}));

    expect(state.room).toBe(fresh);
    expect(state.showVotingResult).toBeTrue();
  });

  it("stores errors of every failed action", () => {
    const error = new Error("boom");
    const failures = [
      RoomAction.initFailure({error}),
      RoomAction.addParticipantFailure({error}),
      RoomAction.removeParticipantFailure({error}),
      RoomAction.cardSelectionFailure({error}),
      RoomAction.startNewVotingFailure({error})
    ];

    failures.forEach(action => {
      const state = roomReducer(roomState(), action);
      expect(state.error).withContext(action.type).toBe(error);
      expect(state.status).withContext(action.type).toBe(RoomStatus.error);
    });
  });

  it("tells a missing room from other errors", () => {
    const error = {destination: "/app/room/id/participants/add", message: "Room \"id\" is not found", code: ErrorCode.roomNotFound};

    expect(roomReducer(roomState(), RoomAction.initFailure({error})).status).toBe(RoomStatus.missing);
    expect(roomReducer(roomState(), RoomAction.addParticipantFailure({error})).status).toBe(RoomStatus.missing);
  });

  it("forgets the room once it is closed", () => {
    const state = roomReducer(roomState({showVotingResult: true}), RoomAction.closed({roomId: "id"}));

    expect(state.status).toBe(RoomStatus.closed);
    expect(state.room.id).toBe("");
    expect(state.room.name).toBe("");
    expect(state.showVotingResult).toBeFalse();
  });

  it("adds a participant to the room", () => {
    const state = roomReducer(roomState(), RoomAction.addParticipantSuccess({participant: participant("Alex", true)}));

    expect(state.room.participants).toEqual([participant("Dmitry"), participant("Alex", true)]);
  });

  it("does not add a participant who is already in the room", () => {
    const state = roomReducer(roomState(), RoomAction.addParticipantSuccess({participant: participant(" dmitry ")}));

    expect(state.room.participants).toEqual([participant("Dmitry")]);
  });

  it("removes a participant together with their vote", () => {
    const before = roomState({
      room: room({
        participants: [participant("Dmitry"), participant("Alex")],
        votingResult: {map: votes({Dmitry: "1h", Alex: "1d"})}
      })
    });

    const state = roomReducer(before, RoomAction.removeParticipantSuccess({participant: participant("Alex")}));

    expect(state.room.participants).toEqual([participant("Dmitry")]);
    expect(state.room.votingResult.map).toEqual(votes({Dmitry: "1h"}));
    expect(before.room.votingResult.map.size).withContext("previous state is not mutated").toBe(2);
  });

  it("is loading while a card is selected", () => {
    const state = roomReducer(roomState(), RoomAction.selectCard({participant: participant("Dmitry"), card: {value: "1h"}}));

    expect(state.status).toBe(RoomStatus.loading);
  });

  it("records and replaces votes", () => {
    let state = roomReducer(roomState(), RoomAction.cardSelectionSuccess({participant: participant("Dmitry"), card: {value: "1h"}}));
    state = roomReducer(state, RoomAction.cardSelectionSuccess({participant: participant("Alex"), card: {value: "2h"}}));
    state = roomReducer(state, RoomAction.cardSelectionSuccess({participant: participant("Dmitry"), card: {value: "1d"}}));

    expect(state.room.votingResult.map).toEqual(votes({Dmitry: "1d", Alex: "2h"}));
    expect(state.status).toBe(RoomStatus.success);
  });

  it("reveals the votes", () => {
    const state = roomReducer(roomState(), RoomAction.showVotingResultSuccess());

    expect(state.showVotingResult).toBeTrue();
  });

  it("clears the votes and hides the result for a new voting", () => {
    const before = roomState({
      room: room({votingResult: {map: votes({Dmitry: "1h"})}}),
      showVotingResult: true
    });

    const state = roomReducer(before, RoomAction.startNewVotingSuccess());

    expect(state.room.votingResult.map.size).toBe(0);
    expect(state.showVotingResult).toBeFalse();
    expect(state.room.participants).toEqual(before.room.participants);
  });

  it("ignores unrelated actions", () => {
    const before = roomState();

    expect(roomReducer(before, RoomAction.doNothing())).toBe(before);
  });
});
