import * as ParticipantSelector from "./participant.selector";
import {appState, participant} from "../../testing/test-data";
import {CurrentParticipantStatus} from "./current-participant-state";

describe("participant selectors", () => {

  it("select parts of the current participant state", () => {
    const state = appState({}, {
      currentParticipant: participant("Alex", true),
      selectedCard: {value: "1h"},
      status: CurrentParticipantStatus.loading
    });

    expect(ParticipantSelector.currentParticipantSelector(state)).toEqual(participant("Alex", true));
    expect(ParticipantSelector.statusSelector(state)).toBe(CurrentParticipantStatus.loading);
    expect(ParticipantSelector.selectedCardSelector(state)).toEqual({value: "1h"});
  });

  it("tells whether the current participant is a watcher", () => {
    expect(ParticipantSelector.currentWatcherSelector(appState({}, {currentParticipant: participant("Alex", true)}))).toBeTrue();
    expect(ParticipantSelector.currentWatcherSelector(appState({}, {currentParticipant: participant("Alex")}))).toBeFalse();
  });

  it("treats someone who has not joined yet as a watcher", () => {
    expect(ParticipantSelector.currentWatcherSelector(appState({}, {currentParticipant: undefined}))).toBeTrue();
  });

  it("tells whether the participant is returning to the seat", () => {
    expect(ParticipantSelector.returningSelector(appState({}, {status: CurrentParticipantStatus.returning}))).toBeTrue();
    expect(ParticipantSelector.returningSelector(appState({}, {status: CurrentParticipantStatus.loading}))).toBeFalse();
  });

  it("tells whether the participant has joined", () => {
    expect(ParticipantSelector.joinedSelector(appState())).toBeTrue();
    expect(ParticipantSelector.joinedSelector(appState({}, {currentParticipant: undefined}))).toBeFalse();
  });
});
