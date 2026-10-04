import * as RoomSelector from "./room.selector";
import {appState, cards, participant, room, votes} from "../../testing/test-data";
import {RoomStatus} from "./room-state";
import {ErrorCode} from "../../models/room-event";

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

  it("tell the error only while the room is in the error state", () => {
    const error = {destination: "/app/room/create", message: "invalid deck", code: ErrorCode.invalidData};
    expect(RoomSelector.errorSelector(appState({status: RoomStatus.error, error}))).toBe(error);
    expect(RoomSelector.errorSelector(appState({status: RoomStatus.loading, error: {message: "invalid deck"}}))).toBeUndefined();
  });

  describe("flip delays", () => {
    function flipDelays(deck: string[], votesByNickname: { [nickname: string]: string }): Map<string, number> {
      return RoomSelector.flipDelaysSelector(appState({room: room({deck: {cards: cards(...deck)}, votingResult: {map: votes(votesByNickname)}})}));
    }

    it("turn the lowest voted value over at once and the next voted value one step later", () => {
      expect(flipDelays(["NA", "1h", "2h", "3h"], {Dmitry: "2h", Alex: "NA"}))
        .toEqual(new Map([["Dmitry", 0.3], ["Alex", 0]]));
    });

    it("turn the lowest voted value over at once even when it is not the first card of the deck", () => {
      expect(flipDelays(["NA", "1h", "2h", "3h"], {Dmitry: "2h", Alex: "1h"}))
        .toEqual(new Map([["Dmitry", 0.3], ["Alex", 0]]));
    });

    it("follow the deck order, not the order of the votes", () => {
      expect(flipDelays(["1h", "2h", "1d"], {Dmitry: "1d", Alex: "1h", Maria: "2h"}))
        .toEqual(new Map([["Dmitry", 0.6], ["Alex", 0], ["Maria", 0.3]]));
    });

    it("turn equal votes over together", () => {
      expect(flipDelays(["1h", "2h", "1d"], {Dmitry: "1d", Alex: "1h", Maria: "1d"}))
        .toEqual(new Map([["Dmitry", 0.3], ["Alex", 0], ["Maria", 0.3]]));
    });

    it("shrink the step so that the last card starts turning within 1.5 seconds", () => {
      const deck = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"];
      const delays = flipDelays(deck, Object.fromEntries(deck.map(value => [`voter ${value}`, value])));

      expect(delays.get("voter 0")).toBe(0);
      expect(delays.get("voter 1")).toBeCloseTo(0.15);
      expect(delays.get("voter 89")).toBeCloseTo(1.5);
    });

    it("are empty when nobody voted", () => {
      expect(flipDelays(["1h", "2h"], {})).toEqual(new Map());
    });
  });

  describe("history", () => {
    function history(deck: string[], rounds: { [nickname: string]: string }[]): RoomSelector.HistoryRound[] {
      return RoomSelector.historySelector(appState({room: room({
        deck: {cards: cards(...deck)},
        history: rounds.map((votesByNickname, index) => ({
          revealedAt: `2026-10-04T17:0${index}:00.000Z`,
          votes: Object.entries(votesByNickname).map(([nickname, card]) => ({nickname, card}))
        }))
      })}));
    }

    it("lists the latest round first, numbered in the order they were revealed", () => {
      const rounds = history(["1h", "1d"], [{Dmitry: "1h"}, {Dmitry: "1d"}]);

      expect(rounds.map(round => [round.number, round.revealedAt])).toEqual([
        [2, "2026-10-04T17:01:00.000Z"],
        [1, "2026-10-04T17:00:00.000Z"]
      ]);
    });

    it("counts the votes for every card in the order of the deck", () => {
      const [round] = history(["1h", "2h", "1d"], [{Dmitry: "1d", Alex: "1h", Kate: "1d"}]);

      expect(round.tally).toEqual([{card: "1h", count: 1}, {card: "1d", count: 2}]);
      expect(round.result).toBe("1d");
      expect(round.votes).toEqual([{nickname: "Dmitry", card: "1d"}, {nickname: "Alex", card: "1h"}, {nickname: "Kate", card: "1d"}]);
    });

    it("have no result when several cards share the most votes", () => {
      const [round] = history(["1h", "1d"], [{Dmitry: "1d", Alex: "1h"}]);

      expect(round.result).toBeUndefined();
    });

    it("put cards that aren't in the deck anymore last", () => {
      const [round] = history(["S", "M"], [{Dmitry: "1h", Alex: "M"}]);

      expect(round.tally.map(entry => entry.card)).toEqual(["M", "1h"]);
    });

    it("are empty before the first round is revealed", () => {
      expect(history(["1h"], [])).toEqual([]);
    });
  });
});
