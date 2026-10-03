import * as RoomSelector from "./room.selector";
import {appState, cards, participant, room, votes} from "../../testing/test-data";
import {RoomStatus} from "./room-state";

describe("room selectors", () => {
  const state = appState({
    room: room({
      id: "room-1",
      name: "Planning",
      deck: {cards: cards("1h", "1d")},
      participants: [participant("Dmitry"), participant("Alex", true)],
      votingResult: {map: votes({Dmitry: "1h"})}
    }),
    showVotingResult: true,
    status: RoomStatus.loading
  });

  it("select parts of the room state", () => {
    expect(RoomSelector.statusSelector(state)).toBe(RoomStatus.loading);
    expect(RoomSelector.idSelector(state)).toBe("room-1");
    expect(RoomSelector.nameSelector(state)).toBe("Planning");
    expect(RoomSelector.participantsSelector(state)).toEqual([participant("Dmitry"), participant("Alex", true)]);
    expect(RoomSelector.cardsSelector(state)).toEqual(cards("1h", "1d"));
    expect(RoomSelector.votingResultSelector(state).map).toEqual(votes({Dmitry: "1h"}));
    expect(RoomSelector.showVotingResultSelector(state)).toBeTrue();
  });

  it("describe the error only while the room is in the error state", () => {
    expect(RoomSelector.errorSelector(appState({status: RoomStatus.error, error: {destination: "/app/room/create", message: "invalid deck"}})))
      .toBe("invalid deck");
    expect(RoomSelector.errorSelector(appState({status: RoomStatus.loading, error: {message: "invalid deck"}}))).toBeUndefined();
  });
});
