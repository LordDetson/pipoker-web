import * as ParticipantSelector from "./participant.selector";
import {CurrentParticipantState, CurrentParticipantStatus} from "./current-participant-state";
import {currentParticipantStateNode} from "../intex";

describe("participant selectors", () => {

  function state(currentParticipant: CurrentParticipantState["currentParticipant"]) {
    return {
      [currentParticipantStateNode]: {
        currentParticipant,
        selectedCard: undefined,
        error: undefined,
        status: CurrentParticipantStatus.success
      }
    };
  }

  it("tells whether the current participant is a watcher", () => {
    expect(ParticipantSelector.currentWatcherSelector(state({nickname: "Alex", watcher: true}))).toBeTrue();
    expect(ParticipantSelector.currentWatcherSelector(state({nickname: "Alex", watcher: false}))).toBeFalse();
  });

  it("treats someone who has not joined yet as a watcher", () => {
    expect(ParticipantSelector.currentWatcherSelector(state(undefined))).toBeTrue();
  });
});
