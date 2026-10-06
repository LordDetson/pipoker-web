import {TestBed} from "@angular/core/testing";
import {Feedback, FeedbackService, describeBrowser, describeRoom, localTime} from "./feedback.service";
import {cards, participant, room, roomState, votes} from "../testing/test-data";
import {RoomStatus} from "../store/room/room-state";
import {HistoryRound} from "../store/room/room.selector";
import {environment} from "../../env/env";

describe("FeedbackService", () => {
  let service: FeedbackService;
  let fetchSpy: jasmine.Spy<typeof fetch>;

  const feedback: Feedback = {
    kind: "problem", message: "The cards don't turn over", contact: "@alex", page: "http://localhost/", browser: "Firefox",
    language: "en", browserLanguages: "en", screen: "1920x1080", window: "1366x768",
    time: "2026-10-05 17:05:00 +03:00", timeZone: "Europe/Minsk"
  };

  beforeEach(() => {
    service = TestBed.inject(FeedbackService);
    fetchSpy = spyOn(window, "fetch");
  });

  it("posts the feedback to the server", async () => {
    fetchSpy.and.resolveTo(new Response(null, {status: 204}));

    expect(await service.send(feedback)).toBe("sent");
    expect(fetchSpy).toHaveBeenCalledOnceWith(environment.apiUrl + "/feedback", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(feedback)
    });
  });

  it("tells when the browser sent too many messages", async () => {
    fetchSpy.and.resolveTo(new Response(null, {status: 429}));

    expect(await service.send(feedback)).toBe("limited");
  });

  it("tells when the server didn't pass the feedback on", async () => {
    fetchSpy.and.resolveTo(new Response(null, {status: 503}));

    expect(await service.send(feedback)).toBe("failed");
  });

  it("tells when the server can't be reached", async () => {
    fetchSpy.and.rejectWith(new TypeError("Failed to fetch"));

    expect(await service.send(feedback)).toBe("failed");
  });
});

describe("localTime", () => {
  it("writes the local time with its offset", () => {
    const date = new Date(2026, 9, 5, 7, 5, 9);
    const offset = -date.getTimezoneOffset();
    const sign = offset < 0 ? "-" : "+";
    const hours = String(Math.trunc(Math.abs(offset) / 60)).padStart(2, "0");
    const minutes = String(Math.abs(offset) % 60).padStart(2, "0");

    expect(localTime(date)).toBe(`2026-10-05 07:05:09 ${sign}${hours}:${minutes}`);
  });
});

describe("describeBrowser", () => {
  it("adds the page, the browser and the time, but nothing about the room's people", () => {
    const details = describeBrowser("ru", new Date(2026, 9, 5, 17, 5, 0));

    expect(details.page).toBe(location.href);
    expect(details.browser).toBe(navigator.userAgent);
    expect(details.language).toBe("ru");
    expect(details.browserLanguages).toBe(navigator.languages.join(", "));
    expect(details.screen).toBe(`${screen.width}x${screen.height}`);
    expect(details.window).toBe(`${window.innerWidth}x${window.innerHeight}`);
    expect(details.time).toMatch(/^2026-10-05 17:05:00 [+-]\d\d:\d\d$/);
    expect(details.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(Object.keys(details)).toEqual(["page", "browser", "language", "browserLanguages", "screen", "window", "time", "timeZone"]);
  });
});

describe("describeRoom", () => {
  const people = [participant("Dmitry"), participant("Alex"), participant("Bob"), participant("Kate", true)];

  it("counts the people and the votes while they vote", () => {
    const state = roomState({room: room({participants: people, votingResult: {map: votes({Dmitry: "1h", Bob: "2h"})}})});

    expect(describeRoom(state, undefined)).toEqual({
      roomId: state.room.id, voters: 3, watchers: 1, voted: 2, round: "voting", estimate: undefined
    });
  });

  it("tells that the cards are revealed and the estimate the team accepted", () => {
    const state = roomState({
      room: room({participants: people, deck: {cards: cards("1h", "2h")}, votingResult: {map: votes({Dmitry: "1h"})}}),
      showVotingResult: true
    });
    const revealed = {number: 1, revealedAt: "2026-10-05T17:00:00Z", tally: [], votes: [], estimate: "2h"} as HistoryRound;

    expect(describeRoom(state, revealed)).toEqual(jasmine.objectContaining({round: "revealed", voted: 1, estimate: "2h"}));
  });

  it("keeps only the id of a room that is gone", () => {
    expect(describeRoom(roomState({status: RoomStatus.missing}), undefined)).toEqual({roomId: roomState().room.id});
  });

  it("sends nothing about a room outside one", () => {
    expect(describeRoom(roomState({room: room({id: ""})}), undefined)).toEqual({});
  });
});
