import {currentParticipantReducer} from "./participant.reducer";
import * as ParticipantAction from "./participant.action";
import {CurrentParticipantStatus} from "./current-participant-state";
import * as RoomAction from "../room/room.action";
import {currentParticipantState, participant, room, votes} from "../../testing/test-data";

describe("currentParticipantReducer", () => {

  it("starts without a participant", () => {
    const state = currentParticipantReducer(undefined, {type: "@@init"});

    expect(state.currentParticipant).toBeUndefined();
    expect(state.selectedCard).toBeUndefined();
    expect(state.status).toBe(CurrentParticipantStatus.pending);
  });

  it("is loading while the participant joins or leaves", () => {
    const pending = currentParticipantState({status: CurrentParticipantStatus.pending});

    expect(currentParticipantReducer(pending, ParticipantAction.init()).status).toBe(CurrentParticipantStatus.loading);
    expect(currentParticipantReducer(pending, ParticipantAction.destroy()).status).toBe(CurrentParticipantStatus.loading);
  });

  it("stores the joined participant", () => {
    const state = currentParticipantReducer(
      currentParticipantState({currentParticipant: undefined, status: CurrentParticipantStatus.loading}),
      ParticipantAction.initSuccess({participant: participant("Alex", true)})
    );

    expect(state.currentParticipant).toEqual(participant("Alex", true));
    expect(state.status).toBe(CurrentParticipantStatus.success);
  });

  it("forgets the participant and the selected card after leaving", () => {
    const state = currentParticipantReducer(
      currentParticipantState({selectedCard: {value: "1h"}}),
      ParticipantAction.destroySuccess()
    );

    expect(state.currentParticipant).toBeUndefined();
    expect(state.selectedCard).toBeUndefined();
    expect(state.status).toBe(CurrentParticipantStatus.success);
  });

  it("stores and clears the selected card", () => {
    let state = currentParticipantReducer(currentParticipantState(), ParticipantAction.initSelectedCurdSuccess({card: {value: "1d"}}));
    expect(state.selectedCard).toEqual({value: "1d"});

    state = currentParticipantReducer(state, ParticipantAction.destroySelectedCurdSuccess());
    expect(state.selectedCard).toBeUndefined();
    expect(state.status).toBe(CurrentParticipantStatus.success);
  });

  it("stores errors of every failed action", () => {
    const error = new Error("boom");
    [
      ParticipantAction.initFailure({error}),
      ParticipantAction.initSelectedCurdFailure({error}),
      ParticipantAction.destroySelectedCurdFailure({error})
    ].forEach(action => {
      const state = currentParticipantReducer(currentParticipantState(), action);
      expect(state.error).withContext(action.type).toBe(error);
      expect(state.status).withContext(action.type).toBe(CurrentParticipantStatus.error);
    });
  });

  it("takes the selected card from the room loaded after a reconnect", () => {
    const joined = currentParticipantState({currentParticipant: participant("Dmitry"), selectedCard: {value: "1h"}});

    expect(currentParticipantReducer(joined, RoomAction.refreshSuccess({room: room({votingResult: {map: votes({Dmitry: "2h"})}})})).selectedCard)
      .toEqual({value: "2h"});
    expect(currentParticipantReducer(joined, RoomAction.refreshSuccess({room: room()})).selectedCard)
      .withContext("a new round started while the connection was gone").toBeUndefined();
  });
});
