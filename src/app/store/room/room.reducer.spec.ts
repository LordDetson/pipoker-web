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
      RoomAction.startNewVotingFailure({error}),
      RoomAction.changeRoleFailure({error})
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

  it("tells that the room no longer exists once everyone left it", () => {
    const state = roomReducer(roomState(), RoomAction.removed({roomId: "id"}));

    expect(state.status).toBe(RoomStatus.missing);
    expect(state.room.id).toBe("");
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

  it("changes the role of a participant, who keeps their place among the others", () => {
    const before = roomState({room: room({participants: [participant("Dmitry"), participant("Alex"), participant("Kate")]})});

    const state = roomReducer(before, RoomAction.roleChanged({participant: participant(" alex ", true)}));

    expect(state.room.participants).toEqual([participant("Dmitry"), participant("Alex", true), participant("Kate")]);
    expect(before.room.participants[1].watcher).withContext("previous state is not mutated").toBeFalse();
  });

  it("removes a vote taken back", () => {
    const before = roomState({room: room({votingResult: {map: votes({Dmitry: "1h", Alex: "1d"})}})});

    const state = roomReducer(before, RoomAction.voteRemoved({nickname: "Alex"}));

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
    const before = roomState();

    const state = roomReducer(before, RoomAction.showVotingResultSuccess({}));

    expect(state.showVotingResult).toBeTrue();
    expect(state.room.history).withContext("the history does not change without a new round").toBe(before.room.history);
  });

  it("stops the timer when the votes are revealed", () => {
    const before = roomState({room: room({timer: {seconds: 60, endsAt: Date.now() + 30000}})});

    const state = roomReducer(before, RoomAction.showVotingResultSuccess({}));

    expect(state.room.timer).toBeUndefined();
    expect(before.room.timer).withContext("previous state is not mutated").toBeDefined();
  });

  it("adds the revealed round to the history", () => {
    const first = {revealedAt: "2026-10-04T17:00:00.123Z", votes: [{nickname: "Dmitry", card: "1h"}]};
    const second = {revealedAt: "2026-10-04T17:05:00.456Z", votes: [{nickname: "Dmitry", card: "1d"}]};
    const before = roomState({room: room({history: [first]})});

    const state = roomReducer(before, RoomAction.showVotingResultSuccess({round: second}));

    expect(state.room.history).toEqual([first, second]);
    expect(before.room.history).withContext("previous state is not mutated").toEqual([first]);
  });

  it("does not add a round the room loaded after a reconnect already has", () => {
    const round = {revealedAt: "2026-10-04T17:00:00.123Z", votes: [{nickname: "Dmitry", card: "1h"}]};

    const state = roomReducer(roomState({room: room({history: [round]})}), RoomAction.showVotingResultSuccess({round: {...round}}));

    expect(state.room.history).toEqual([round]);
  });

  it("clears the votes and hides the result for a new voting", () => {
    const before = roomState({
      room: room({votingResult: {map: votes({Dmitry: "1h"})}}),
      showVotingResult: true
    });

    const state = roomReducer(before, RoomAction.startNewVotingSuccess({}));

    expect(state.room.votingResult.map.size).toBe(0);
    expect(state.showVotingResult).toBeFalse();
    expect(state.room.participants).toEqual(before.room.participants);
  });

  it("ignores unrelated actions", () => {
    const before = roomState();

    expect(roomReducer(before, RoomAction.doNothing())).toBe(before);
  });

  it("follows the task of the round, and takes the one the server kept for the next round", () => {
    const task = {name: "PIP-25", url: "https://example.com/PIP-25"};

    const named = roomReducer(roomState(), RoomAction.taskChanged({task}));
    expect(named.room.task).toBe(task);
    expect(roomReducer(named, RoomAction.taskChanged({})).room.task).toBeUndefined();
    expect(roomReducer(named, RoomAction.startNewVotingSuccess({task})).room.task).toBe(task);
    expect(roomReducer(named, RoomAction.startNewVotingSuccess({})).room.task).toBeUndefined();
  });

  it("puts the accepted estimate on its round of the history", () => {
    const first = {revealedAt: "2026-10-05T12:00:00.000Z", votes: [{nickname: "Dmitry", card: "1h"}]};
    const second = {revealedAt: "2026-10-05T12:05:00.000Z", votes: [{nickname: "Dmitry", card: "1d"}]};
    const accepted = {...second, estimate: "2h"};

    const state = roomReducer(roomState({room: room({history: [first, second]})}), RoomAction.estimateAccepted({round: accepted}));

    expect(state.room.history).toEqual([first, accepted]);
  });

  it("keeps the timer until it is stopped or the next round starts", () => {
    const timer = {seconds: 120, endsAt: 1000};

    const started = roomReducer(roomState(), RoomAction.timerStarted({timer}));
    expect(started.room.timer).toBe(timer);
    expect(roomReducer(started, RoomAction.timerStopped()).room.timer).toBeUndefined();
    expect(roomReducer(started, RoomAction.startNewVotingSuccess({})).room.timer).toBeUndefined();
  });
});
