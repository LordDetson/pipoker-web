import {TestBed} from "@angular/core/testing";
import {defer, Observable, Subject} from "rxjs";
import {RoomService} from "./room.service";
import {RoomWebSocketService} from "./room-web-socket.service";
import {Room} from "../models/room.model";
import {Participant} from "../models/participant.model";
import {Vote} from "../models/vote";
import {RoomEventType} from "../models/room-event";

class FakeRoomWebSocketService {
  sent: { destination: string, body: any }[] = [];
  // Destinations in the order they were subscribed to
  subscribed: string[] = [];
  private destinations = new Map<string, Subject<any>>();

  watch<T>(destination: string): Observable<T> {
    return defer(() => {
      this.subscribed.push(destination);
      return this.destination(destination).asObservable();
    });
  }

  request<T>(destination: string): Observable<T> {
    return this.watch<T>(destination);
  }

  send(destination: string, body: any) {
    this.sent.push({destination, body});
  }

  emit(destination: string, message: any) {
    this.destination(destination).next(message);
  }

  private destination(destination: string): Subject<any> {
    if (!this.destinations.has(destination)) {
      this.destinations.set(destination, new Subject<any>());
    }
    return this.destinations.get(destination)!;
  }
}

describe("RoomService", () => {
  const roomId = "4f9c7a52-2d5e-4c5b-9a8e-0a1b2c3d4e5f";
  let service: RoomService;
  let webSocket: FakeRoomWebSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{provide: RoomWebSocketService, useClass: FakeRoomWebSocketService}]
    });
    service = TestBed.inject(RoomService);
    webSocket = TestBed.inject(RoomWebSocketService) as unknown as FakeRoomWebSocketService;
  });

  it("creates a room over STOMP and maps the reply", () => {
    let room: Room | undefined;
    service.create({
      nickname: "Dmitry",
      roomName: "Sprint",
      deck: {cards: [{value: "1h"}, {value: "1d"}]},
      watcher: false,
      autoReveal: true
    }).subscribe(result => room = result);

    expect(webSocket.sent).toEqual([{
      destination: "/app/room/create",
      body: {
        name: "Sprint",
        deck: {cards: ["1h", "1d"]},
        participants: [{nickname: "Dmitry", watcher: false}],
        autoReveal: true
      }
    }]);

    webSocket.emit("/user/topic/room.created", {
      id: roomId,
      name: "Sprint",
      deck: {cards: ["1h", "1d"]},
      participants: [{nickname: "Dmitry", watcher: false}],
      autoReveal: true
    });

    expect(room!.id).toBe(roomId);
    expect(room!.deck.cards).toEqual([{value: "1h"}, {value: "1d"}]);
    expect(room!.participants).toEqual([{nickname: "Dmitry", watcher: false}]);
    expect(room!.votingResult.map.size).toBe(0);
    expect(room!.autoReveal).toBeTrue();
  });

  it("loads a room that doesn't reveal the cards by itself", () => {
    let room: Room | undefined;
    service.get(roomId).subscribe(result => room = result);

    webSocket.emit("/app/room/" + roomId, {id: roomId, name: "Sprint", deck: {cards: ["1h"]}});

    expect(room!.autoReveal).toBeFalse();
  });

  it("turns on or off revealing the cards by themselves", () => {
    service.setAutoReveal(roomId, false);

    expect(webSocket.sent).toEqual([{destination: "/app/room/" + roomId + "/auto-reveal", body: {autoReveal: false}}]);
  });

  it("loads a room with its votes", () => {
    let room: Room | undefined;
    service.get(roomId).subscribe(result => room = result);

    webSocket.emit("/app/room/" + roomId, {
      id: roomId,
      name: "Sprint",
      deck: {cards: ["1h"]},
      participants: [{nickname: "Dmitry", watcher: false}],
      votes: [{nickname: "Dmitry", card: "1h"}]
    });

    expect(room!.votingResult.map.get("Dmitry")).toEqual({value: "1h"});
    expect(room!.votesShown).toBeFalse();
  });

  it("loads whether the cards of the room are revealed", () => {
    let room: Room | undefined;
    service.get(roomId).subscribe(result => room = result);

    webSocket.emit("/app/room/" + roomId, {id: roomId, name: "Sprint", deck: {cards: ["1h"]}, votesShown: true});

    expect(room!.votesShown).toBeTrue();
    expect(room!.history).toEqual([]);
  });

  it("loads the history of the room", () => {
    let room: Room | undefined;
    service.get(roomId).subscribe(result => room = result);
    const history = [{revealedAt: "2026-10-04T17:00:00.123Z", votes: [{nickname: "Dmitry", card: "1h"}]}];

    webSocket.emit("/app/room/" + roomId, {id: roomId, name: "Sprint", deck: {cards: ["1h"]}, history});

    expect(room!.history).toEqual(history);
  });

  it("counts the loaded timer down from the time left by the clock of this computer", () => {
    spyOn(Date, "now").and.returnValue(10000);
    let room: Room | undefined;
    service.get(roomId).subscribe(result => room = result);

    webSocket.emit("/app/room/" + roomId, {
      id: roomId, name: "Sprint", deck: {cards: ["1h"]}, timer: {seconds: 120, remainingMillis: 90000}
    });

    expect(room!.timer).toEqual({seconds: 120, endsAt: 100000});
  });

  it("loads the task of the current round", () => {
    let room: Room | undefined;
    service.get(roomId).subscribe(result => room = result);

    webSocket.emit("/app/room/" + roomId, {
      id: roomId, name: "Sprint", deck: {cards: ["1h"]}, task: {name: "PIP-25", url: "https://example.com/PIP-25"}
    });

    expect(room!.task).toEqual({name: "PIP-25", url: "https://example.com/PIP-25"});
  });

  it("names the task and resolves when the room hears it, or fails with the server's error", () => {
    const task = {name: "PIP-25", url: ""};
    const named: unknown[] = [];
    service.setTask(roomId, task).subscribe(result => named.push(result));

    expect(webSocket.sent).toEqual([{destination: "/app/room/" + roomId + "/task", body: task}]);
    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.taskChanged, task: {name: "PIP-25"}});
    expect(named).toEqual([{name: "PIP-25"}]);

    let error: any;
    service.setTask(roomId, task).subscribe({error: e => error = e});
    webSocket.emit("/user/topic/room.errors", {destination: "/app/room/" + roomId + "/task", message: "revealed", code: "CARDS_REVEALED"});
    expect(error.code).toBe("CARDS_REVEALED");
  });

  it("accepts the estimate of the revealed round", () => {
    service.acceptEstimate(roomId, {revealedAt: "2026-10-05T12:00:00.000Z", card: "1d"});

    expect(webSocket.sent).toEqual([{
      destination: "/app/room/" + roomId + "/estimate",
      body: {revealedAt: "2026-10-05T12:00:00.000Z", card: "1d"}
    }]);
  });

  it("checks nickname against the current room participants", () => {
    const results: boolean[] = [];
    service.checkIfNicknameExist(roomId, " dmitry ").subscribe(result => results.push(result));
    webSocket.emit("/app/room/" + roomId, {
      id: roomId,
      name: "Sprint",
      deck: {cards: ["1h"]},
      participants: [{nickname: "Dmitry", watcher: false}]
    });

    expect(results).toEqual([true]);
  });

  it("joins a room and resolves with the added participant", () => {
    const participant: Participant = {nickname: "Alex", watcher: true};
    let added: Participant | undefined;
    service.addParticipant(roomId, participant).subscribe(result => added = result);

    expect(webSocket.sent).toEqual([{destination: "/app/room/" + roomId + "/participants/add", body: participant}]);

    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.participantAdded, participant: {nickname: "Other", watcher: false}});
    expect(added).toBeUndefined();
    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.participantAdded, participant});
    expect(added).toEqual(participant);
  });

  it("fails when the server reports an error for the sent message", () => {
    let error: any;
    service.addParticipant(roomId, {nickname: "Alex", watcher: false})
      .subscribe({error: e => error = e});

    webSocket.emit("/user/topic/room.errors", {destination: "/app/room/" + roomId + "/participants/add", message: "exists"});

    expect(error.message).toBe("exists");
  });

  it("changes the role and resolves with the participant the room heard about", () => {
    const participant: Participant = {nickname: "Alex", watcher: true};
    let changed: Participant | undefined;
    service.changeRole(roomId, participant).subscribe(result => changed = result);

    expect(webSocket.sent).toEqual([{destination: "/app/room/" + roomId + "/participants/role", body: participant}]);

    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.participantRoleChanged, participant: {nickname: "Other", watcher: true}});
    expect(changed).toBeUndefined();
    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.participantRoleChanged, participant});
    expect(changed).toEqual(participant);
  });

  it("votes with the card value", () => {
    const participant: Participant = {nickname: "Dmitry", watcher: false};
    let vote: Vote | undefined;
    service.vote(roomId, participant, {value: "1d"}).subscribe(result => vote = result);

    expect(webSocket.sent).toEqual([{destination: "/app/room/" + roomId + "/votes/add", body: {nickname: "Dmitry", card: "1d"}}]);

    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.voteAdded, vote: {nickname: "Dmitry", card: "1d"}});
    expect(vote).toEqual({participant, card: {value: "1d"}});
  });

  it("leaves, clears and shows votes over STOMP", () => {
    service.removeParticipant(roomId, {nickname: "Dmitry", watcher: false}).subscribe();
    service.clearVotingResult(roomId).subscribe();
    service.showVotingResult(roomId);

    expect(webSocket.sent.map(message => message.destination)).toEqual([
      "/app/room/" + roomId + "/participants/remove",
      "/app/room/" + roomId + "/votes/clear",
      "/app/room/" + roomId + "/votes/show"
    ]);
    expect(webSocket.sent[0].body).toBe("Dmitry");
  });
  it("subscribes to errors before asking for a room, so the error for the request has somewhere to go", () => {
    service.get(roomId).subscribe();

    expect(webSocket.subscribed).toEqual(["/user/topic/room.errors", "/app/room/" + roomId]);
  });

  it("fails to load a room the server does not know", () => {
    let error: any;
    service.get(roomId).subscribe({error: e => error = e});

    webSocket.emit("/user/topic/room.errors", {destination: "/app/room/other", message: "other"});
    expect(error).toBeUndefined();
    webSocket.emit("/user/topic/room.errors", {destination: "/app/room/" + roomId, message: "not found"});

    expect(error.message).toBe("not found");
  });

  it("fails to create a room when the server rejects it", () => {
    let error: any;
    service.create({nickname: "Dmitry", roomName: "Sprint", deck: {cards: []}, watcher: false, autoReveal: false})
      .subscribe({error: e => error = e});

    webSocket.emit("/user/topic/room.errors", {destination: "/app/room/create", message: "invalid deck"});

    expect(error.message).toBe("invalid deck");
  });

  it("treats a missing participant list as an empty room", () => {
    let room: Room | undefined;
    service.get(roomId).subscribe(result => room = result);

    webSocket.emit("/app/room/" + roomId, {id: roomId, name: "Sprint", deck: {cards: []}});

    expect(room!.participants).toEqual([]);
    expect(room!.votingResult.map.size).toBe(0);
  });

  it("reports a free nickname", () => {
    const results: boolean[] = [];
    service.checkIfNicknameExist(roomId, "Alex").subscribe(result => results.push(result));

    webSocket.emit("/app/room/" + roomId, {
      id: roomId,
      name: "Sprint",
      deck: {cards: ["1h"]},
      participants: [{nickname: "Dmitry", watcher: false}]
    });

    expect(results).toEqual([false]);
  });

  it("resolves leaving when the server confirms the removal of the participant", () => {
    let removed: Participant | undefined;
    service.removeParticipant(roomId, {nickname: "Dmitry", watcher: false}).subscribe(result => removed = result);

    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.participantRemoved});
    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.participantRemoved, participant: {nickname: "Alex", watcher: false}});
    expect(removed).toBeUndefined();
    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.participantRemoved, participant: {nickname: "dmitry", watcher: false}});

    expect(removed).toEqual({nickname: "dmitry", watcher: false});
  });

  it("returns to the seat when the server confirms it to this tab", () => {
    let returned: Participant | undefined;
    service.returnParticipant(roomId, {nickname: "alex", watcher: false}).subscribe(result => returned = result);

    expect(webSocket.sent).toEqual([{destination: "/app/room/" + roomId + "/participants/return", body: "alex"}]);
    webSocket.emit("/user/topic/room.returned", {roomId: "other", eventType: RoomEventType.participantReturned, participant: {nickname: "Alex", watcher: true}});
    webSocket.emit("/user/topic/room.returned", {roomId, eventType: RoomEventType.participantReturned, participant: {nickname: "Kate", watcher: true}});
    expect(returned).toBeUndefined();
    webSocket.emit("/user/topic/room.returned", {roomId, eventType: RoomEventType.participantReturned, participant: {nickname: "Alex", watcher: true}});

    expect(returned).toEqual({nickname: "Alex", watcher: true});
  });

  it("fails to return to a seat that is gone", () => {
    let error: any;
    service.returnParticipant(roomId, {nickname: "Alex", watcher: false}).subscribe({error: e => error = e});

    webSocket.emit("/user/topic/room.errors", {destination: "/app/room/" + roomId + "/participants/return", message: "Participant \"Alex\" is not in the room"});

    expect(error.message).toBe("Participant \"Alex\" is not in the room");
  });

  it("ignores votes of other participants", () => {
    let vote: Vote | undefined;
    service.vote(roomId, {nickname: "Dmitry", watcher: false}, {value: "1d"}).subscribe(result => vote = result);

    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.voteAdded, vote: {nickname: "Alex", card: "1h"}});

    expect(vote).toBeUndefined();
  });

  it("resolves clearing when the votes are cleared", () => {
    let cleared = false;
    service.clearVotingResult(roomId).subscribe(() => cleared = true);

    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.showVotes});
    expect(cleared).toBeFalse();
    webSocket.emit("/topic/room." + roomId, {roomId, eventType: RoomEventType.clearVotes});

    expect(cleared).toBeTrue();
    expect(webSocket.sent).toEqual([{destination: "/app/room/" + roomId + "/votes/clear", body: roomId}]);
  });
});
