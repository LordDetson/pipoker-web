import {fakeAsync, TestBed, tick} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {RoomWebSocketService, STOMP_CLIENT_FACTORY} from "./room-web-socket.service";
import {FakeStompClient} from "../testing/fake-stomp";
import {RoomEventType} from "../models/room-event";
import * as RoomAction from "../store/room/room.action";
import {participant, ROOM_ID} from "../testing/test-data";

describe("RoomWebSocketService", () => {
  const roomTopic = "/topic/room." + ROOM_ID;
  let service: RoomWebSocketService;
  let clients: FakeStompClient[];
  let store: MockStore;

  beforeEach(() => {
    clients = [];
    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        {
          provide: STOMP_CLIENT_FACTORY, useValue: () => {
            const client = new FakeStompClient();
            clients.push(client);
            return client;
          }
        }
      ]
    });
    service = TestBed.inject(RoomWebSocketService);
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
  });

  function connectedClient(): FakeStompClient {
    const client = clients[clients.length - 1];
    client.completeConnect();
    return client;
  }

  describe("watch", () => {
    it("subscribes once connected and parses messages", () => {
      const messages: any[] = [];
      service.watch("/topic/test").subscribe(message => messages.push(message));
      expect(clients.length).toBe(1);
      expect(clients[0].isSubscribed("/topic/test")).withContext("not connected yet").toBeFalse();

      const client = connectedClient();
      client.deliver("/topic/test", {value: 1});
      client.deliver("/topic/test", {value: 2});

      expect(messages).toEqual([{value: 1}, {value: 2}]);
    });

    it("shares one connection between subscribers", () => {
      service.watch("/topic/a").subscribe();
      service.watch("/topic/b").subscribe();

      expect(clients.length).toBe(1);
      expect(clients[0].connectCalls).toBe(1);
    });

    it("unsubscribes from the broker when the subscriber is done", () => {
      const subscription = service.watch("/topic/test").subscribe();
      const client = connectedClient();

      subscription.unsubscribe();

      expect(client.unsubscribed).toEqual(["/topic/test"]);
      expect(client.isSubscribed("/topic/test")).toBeFalse();
    });

    it("resubscribes after reconnecting", fakeAsync(() => {
      const messages: any[] = [];
      service.watch("/topic/test").subscribe(message => messages.push(message));
      const first = connectedClient();

      first.failConnect();
      expect(first.unsubscribed).withContext("a dead connection is not unsubscribed").toEqual([]);
      tick(4999);
      expect(clients.length).toBe(1);
      tick(1);
      expect(clients.length).toBe(2);

      const second = connectedClient();
      second.deliver("/topic/test", "after reconnect");

      expect(messages).toEqual(["after reconnect"]);
    }));

    it("tells when a lost connection is back, but not on the first connection", fakeAsync(() => {
      let reconnects = 0;
      service.reconnected$.subscribe(() => reconnects++);
      service.watch("/topic/test").subscribe();
      const first = connectedClient();
      expect(reconnects).toBe(0);

      first.failConnect();
      tick(5000);
      connectedClient();

      expect(reconnects).toBe(1);
    }));

    it("does not count a new connection after leaving as a reconnect", () => {
      let reconnects = 0;
      service.reconnected$.subscribe(() => reconnects++);
      service.watch("/topic/test").subscribe();
      connectedClient();
      service.disconnect();

      service.watch("/topic/test").subscribe();
      connectedClient();

      expect(reconnects).toBe(0);
    });

    it("ignores errors of a connection it no longer uses", fakeAsync(() => {
      service.watch("/topic/test").subscribe();
      const first = connectedClient();
      service.disconnect();
      service.watch("/topic/test").subscribe();

      first.failConnect();
      tick(5000);

      expect(clients.length).toBe(2);
    }));
  });

  describe("request", () => {
    it("takes the single reply and drops the subscription without UNSUBSCRIBE", () => {
      const replies: any[] = [];
      let completed = false;
      service.request("/app/room/" + ROOM_ID).subscribe({
        next: reply => replies.push(reply),
        complete: () => completed = true
      });
      const client = connectedClient();
      expect(client.isSubscribed("/app/room/" + ROOM_ID)).toBeTrue();

      client.deliver("/app/room/" + ROOM_ID, {id: ROOM_ID});

      expect(replies).toEqual([{id: ROOM_ID}]);
      expect(completed).toBeTrue();
      expect(client.isSubscribed("/app/room/" + ROOM_ID)).toBeFalse();
      expect(client.unsubscribed).toEqual([]);
    });

    it("drops the subscription when the caller gives up", () => {
      const subscription = service.request("/app/room/" + ROOM_ID).subscribe();
      const client = connectedClient();

      subscription.unsubscribe();

      expect(client.isSubscribed("/app/room/" + ROOM_ID)).toBeFalse();
      expect(client.unsubscribed).toEqual([]);
    });
  });

  describe("send", () => {
    it("waits for the connection and sends objects as JSON", () => {
      service.send("/app/room/create", {name: "Sprint"});
      const client = clients[0];
      expect(client.sent).toEqual([]);

      client.completeConnect();

      expect(client.sent).toEqual([{
        destination: "/app/room/create",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({name: "Sprint"})
      }]);
    });

    it("sends strings as they are", () => {
      service.send("/app/room/" + ROOM_ID + "/participants/remove", "Dmitry");
      const client = connectedClient();

      expect(client.sent).toEqual([{destination: "/app/room/" + ROOM_ID + "/participants/remove", headers: {}, body: "Dmitry"}]);
    });

    it("sends only once even if the connection is restored later", fakeAsync(() => {
      service.send("/app/test", "body");
      const first = connectedClient();
      first.failConnect();
      tick(5000);
      connectedClient();

      expect(first.sent.length).toBe(1);
      expect(clients[1].sent.length).toBe(0);
    }));
  });

  describe("room events", () => {
    beforeEach(() => service.connect(ROOM_ID));

    it("dispatches room events to the store", () => {
      const client = connectedClient();
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantAdded, participant: participant("Alex", true)});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.voteAdded, vote: {nickname: "Alex", card: "1d"}});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.showVotes});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.clearVotes});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantRemoved, participant: participant("Alex", true)});

      expect((store.dispatch as jasmine.Spy).calls.allArgs()).toEqual([
        [RoomAction.addParticipantSuccess({participant: participant("Alex", true)})],
        [RoomAction.cardSelectionSuccess({participant: participant("Alex"), card: {value: "1d"}})],
        [RoomAction.showVotingResultSuccess()],
        [RoomAction.startNewVotingSuccess()],
        [RoomAction.removeParticipantSuccess({participant: participant("Alex", true)})]
      ]);
    });

    it("ignores the removal of an unknown participant and unsupported events", () => {
      const client = connectedClient();
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantRemoved});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.voteRemoved, vote: {nickname: "Alex", card: "1d"}});

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it("listens to one room at a time", () => {
      service.connect("other-room");
      const client = connectedClient();

      expect(client.isSubscribed(roomTopic)).toBeFalse();
      expect(client.isSubscribed("/topic/room.other-room")).toBeTrue();
    });

    it("stops listening and closes the connection on disconnect", () => {
      const client = connectedClient();

      service.disconnect();
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.showVotes});

      expect(client.disconnected).toBeTrue();
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  it("does nothing when disconnecting without a connection", () => {
    expect(() => service.disconnect()).not.toThrow();
  });
});
