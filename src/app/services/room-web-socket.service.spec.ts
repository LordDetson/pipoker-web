import {fakeAsync, TestBed, tick} from "@angular/core/testing";
import {NgZone} from "@angular/core";
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

  function confirmAll(client: FakeStompClient) {
    Object.keys(client.receipts).forEach(id => client.confirm(id));
  }

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

    it("shares one subscription to the broker between everyone watching a destination", () => {
      const first: any[] = [];
      const second: any[] = [];
      const firstSubscription = service.watch("/topic/test").subscribe(message => first.push(message));
      const secondSubscription = service.watch("/topic/test").subscribe(message => second.push(message));
      const client = connectedClient();
      expect(Object.values(client.destinations)).toEqual(["/topic/test"]);

      client.deliver("/topic/test", {value: 1});
      secondSubscription.unsubscribe();
      expect(client.unsubscribed).withContext("someone still watches").toEqual([]);
      client.deliver("/topic/test", {value: 2});
      firstSubscription.unsubscribe();

      expect(first).toEqual([{value: 1}, {value: 2}]);
      expect(second).toEqual([{value: 1}]);
      expect(client.unsubscribed).toEqual(["/topic/test"]);
    });

    it("resubscribes after reconnecting", fakeAsync(() => {
      const messages: any[] = [];
      service.watch("/topic/test").subscribe(message => messages.push(message));
      const first = connectedClient();

      first.failConnect();
      expect(first.unsubscribed).withContext("a dead connection is not unsubscribed").toEqual([]);
      tick(999);
      expect(clients.length).toBe(1);
      tick(1);
      expect(clients.length).toBe(2);

      const second = connectedClient();
      second.deliver("/topic/test", "after reconnect");

      expect(messages).toEqual(["after reconnect"]);
    }));

    it("waits longer after every failed attempt and starts over once connected", fakeAsync(() => {
      service.watch("/topic/test").subscribe();
      connectedClient().failConnect();

      [1000, 2000, 4000, 5000, 5000].forEach((delay, attempt) => {
        tick(delay - 1);
        expect(clients.length).withContext("before attempt " + (attempt + 1)).toBe(attempt + 1);
        tick(1);
        expect(clients.length).withContext("attempt " + (attempt + 1)).toBe(attempt + 2);
        clients[clients.length - 1].failConnect();
      });

      tick(5000);
      connectedClient().failConnect();
      tick(1000);
      expect(clients.length).withContext("the first delay again").toBe(8);
    }));

    it("connects at once when the browser is back online", fakeAsync(() => {
      service.watch("/topic/test").subscribe();
      connectedClient().failConnect();

      window.dispatchEvent(new Event("online"));

      expect(clients.length).toBe(2);
      tick(1000);
      expect(clients.length).withContext("the waiting attempt is dropped").toBe(2);
    }));

    it("does not connect again after leaving", fakeAsync(() => {
      service.watch("/topic/test").subscribe();
      connectedClient().failConnect();

      service.disconnect();
      tick(5000);
      window.dispatchEvent(new Event("online"));

      expect(clients.length).toBe(1);
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

    it("asks again on the new connection when the connection is lost before the answer", fakeAsync(() => {
      const replies: any[] = [];
      let completed = false;
      service.request("/app/room/" + ROOM_ID).subscribe({
        next: reply => replies.push(reply),
        complete: () => completed = true
      });
      const first = connectedClient();

      first.lose();
      tick(1000);
      const second = connectedClient();
      expect(second.isSubscribed("/app/room/" + ROOM_ID)).toBeTrue();
      second.deliver("/app/room/" + ROOM_ID, {id: ROOM_ID});

      expect(replies).toEqual([{id: ROOM_ID}]);
      expect(completed).toBeTrue();
      expect(second.isSubscribed("/app/room/" + ROOM_ID)).toBeFalse();
      expect(first.unsubscribed).toEqual([]);
      expect(second.unsubscribed).toEqual([]);
    }));

    it("waits until the broker has set up the subscriptions made before, as the errors of the request come there", () => {
      service.watch("/topic/test").subscribe();
      service.request("/app/room/" + ROOM_ID).subscribe();
      const client = clients[0];
      client.confirmAtOnce = false;
      client.completeConnect();
      expect(client.isSubscribed("/app/room/" + ROOM_ID)).withContext("before the receipt").toBeFalse();

      confirmAll(client);

      expect(client.isSubscribed("/app/room/" + ROOM_ID)).toBeTrue();
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

    it("waits until the broker has set up the subscriptions made before, so the answer reaches the one waiting for it", () => {
      service.watch("/topic/room").subscribe();
      service.send("/app/room/" + ROOM_ID + "/participants/add", {nickname: "Dmitry", watcher: false});
      const client = clients[0];
      client.confirmAtOnce = false;
      client.completeConnect();
      expect(client.receipts).toEqual({"sub-0": jasmine.any(String)});
      expect(client.sent).withContext("before the receipt").toEqual([]);

      confirmAll(client);

      expect(client.sent.map(frame => frame.destination)).toEqual(["/app/room/" + ROOM_ID + "/participants/add"]);
    });

    it("does not wait for receipts asked for on a lost connection", fakeAsync(() => {
      service.watch("/topic/room").subscribe();
      const first = clients[0];
      first.confirmAtOnce = false;
      first.completeConnect();
      first.lose();
      service.send("/app/test", "body");
      tick(1000);

      const second = connectedClient();

      expect(second.sent.length).toBe(1);
    }));

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
      const round = {revealedAt: "2026-10-04T17:00:00.123Z", votes: [{nickname: "Alex", card: "1d"}]};
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantAdded, participant: participant("Alex", true)});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.voteAdded, vote: {nickname: "Alex", card: "1d"}});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.showVotes, round});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.showVotes});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.clearVotes});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantRemoved, participant: participant("Alex", true)});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.roomClosed});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.roomRemoved});
      spyOn(Date, "now").and.returnValue(5000);
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.timerStarted, timer: {seconds: 60, remainingMillis: 59000}});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.timerStopped});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.taskChanged, task: {name: "PIP-25"}});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.taskChanged});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.estimateAccepted, round: {...round, estimate: "1d"}});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.clearVotes, task: {name: "PIP-25"}});

      expect((store.dispatch as jasmine.Spy).calls.allArgs()).toEqual([
        [RoomAction.addParticipantSuccess({participant: participant("Alex", true)})],
        [RoomAction.cardSelectionSuccess({participant: participant("Alex"), card: {value: "1d"}})],
        [RoomAction.showVotingResultSuccess({round})],
        [RoomAction.showVotingResultSuccess({round: undefined})],
        [RoomAction.startNewVotingSuccess({task: undefined})],
        [RoomAction.removeParticipantSuccess({participant: participant("Alex", true)})],
        [RoomAction.closed({roomId: ROOM_ID})],
        [RoomAction.removed({roomId: ROOM_ID})],
        [RoomAction.timerStarted({timer: {seconds: 60, endsAt: 64000}})],
        [RoomAction.timerStopped()],
        [RoomAction.taskChanged({task: {name: "PIP-25"}})],
        [RoomAction.taskChanged({task: undefined})],
        [RoomAction.estimateAccepted({round: {...round, estimate: "1d"}})],
        [RoomAction.startNewVotingSuccess({task: {name: "PIP-25"}})]
      ]);
    });

    it("ignores the removal of an unknown participant or vote and unsupported events", () => {
      const client = connectedClient();
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantRemoved});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.voteRemoved});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantReturned, participant: participant("Alex")});

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it("tells the store about a changed role and the vote it took back", () => {
      const client = connectedClient();
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.voteRemoved, vote: {nickname: "Alex", card: "1d"}});
      client.deliver(roomTopic, {roomId: ROOM_ID, eventType: RoomEventType.participantRoleChanged, participant: participant("Alex", true)});

      expect((store.dispatch as jasmine.Spy).calls.allArgs()).toEqual([
        [RoomAction.voteRemoved({nickname: "Alex"})],
        [RoomAction.roleChanged({participant: participant("Alex", true)})]
      ]);
    });

    it("keeps watching errors while the room is open, so a check or a vote doesn't unsubscribe from them", () => {
      const client = connectedClient();
      expect(client.isSubscribed("/user/topic/room.errors")).toBeTrue();

      service.watch("/user/topic/room.errors").subscribe().unsubscribe();
      service.watch(roomTopic).subscribe().unsubscribe();

      expect(client.unsubscribed).toEqual([]);
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

  describe("presence", () => {
    function hidePage(persisted = false) {
      window.dispatchEvent(new PageTransitionEvent("pagehide", {persisted}));
    }

    it("beats every 3 seconds both ways, so the server notices a lost connection soon", () => {
      service.watch("/topic/test").subscribe();

      expect(clients[0].heartbeat).toEqual({outgoing: 3000, incoming: 3000});
    });

    it("tells the server when the page is closed", () => {
      service.watch("/topic/test").subscribe();
      const client = connectedClient();

      hidePage();

      expect(client.sent).toEqual([{destination: "/app/presence/page-closed", headers: {}, body: ""}]);
    });

    it("says it from the other listener when Firefox stops the first one midway", () => {
      const listeners: { listener: any, capture?: boolean }[] = [];
      spyOn(window, "addEventListener").and.callFake((type: string, listener: any, capture?: any) => {
        if (type === "pagehide") {
          listeners.push({listener, capture});
        }
      });
      const pageService = new RoomWebSocketService(store, TestBed.inject(NgZone), TestBed.inject(STOMP_CLIENT_FACTORY), [1000]);
      pageService.watch("/topic/test").subscribe();
      const client = connectedClient();
      const event = new PageTransitionEvent("pagehide", {persisted: false});
      expect(listeners.map(({capture}) => capture)).withContext("one listener captures, so it runs separately").toEqual([true, undefined]);

      // A stopped script ends where it is, like the error does here
      const send = spyOn(client, "send").and.throwError("stopped");
      expect(() => listeners[0].listener(event)).toThrowError("stopped");
      send.and.callThrough();
      listeners[1].listener(event);

      expect(client.sent).toEqual([{destination: "/app/presence/page-closed", headers: {}, body: ""}]);
    });

    it("says nothing when the page is kept in the back-forward cache", () => {
      service.watch("/topic/test").subscribe();
      const client = connectedClient();

      hidePage(true);

      expect(client.sent).toEqual([]);
    });

    it("does not connect to tell that the page is closed", () => {
      hidePage();
      expect(clients.length).toBe(0);

      service.watch("/topic/test").subscribe();
      hidePage();
      expect(clients[0].sent).withContext("still connecting").toEqual([]);
    });

    it("stops watching the page when destroyed", () => {
      service.ngOnDestroy();
      service.watch("/topic/test").subscribe();
      const client = connectedClient();

      hidePage();

      expect(client.sent).toEqual([]);
    });
  });

  it("does nothing when disconnecting without a connection", () => {
    expect(() => service.disconnect()).not.toThrow();
  });
});
