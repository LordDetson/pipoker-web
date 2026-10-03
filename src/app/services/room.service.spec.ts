import {TestBed} from "@angular/core/testing";
import {Observable, Subject} from "rxjs";
import {RoomService} from "./room.service";
import {RoomWebSocketService} from "./room-web-socket.service";
import {Room} from "../models/room.model";
import {Participant} from "../models/participant.model";
import {Vote} from "../models/vote";
import {RoomEventType} from "../models/room-event";

class FakeRoomWebSocketService {
  sent: { destination: string, body: any }[] = [];
  private destinations = new Map<string, Subject<any>>();

  watch<T>(destination: string): Observable<T> {
    return this.destination(destination).asObservable();
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
      watcher: false
    }).subscribe(result => room = result);

    expect(webSocket.sent).toEqual([{
      destination: "/app/room/create",
      body: {
        name: "Sprint",
        deck: {cards: ["1h", "1d"]},
        participants: [{nickname: "Dmitry", watcher: false}]
      }
    }]);

    webSocket.emit("/user/topic/room.created", {
      id: roomId,
      name: "Sprint",
      deck: {cards: ["1h", "1d"]},
      participants: [{nickname: "Dmitry", watcher: false}]
    });

    expect(room!.id).toBe(roomId);
    expect(room!.deck.cards).toEqual([{value: "1h"}, {value: "1d"}]);
    expect(room!.participants).toEqual([{nickname: "Dmitry", watcher: false}]);
    expect(room!.votingResult.map.size).toBe(0);
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
});
