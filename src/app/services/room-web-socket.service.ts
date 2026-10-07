import {inject, Inject, Injectable, InjectionToken, NgZone, OnDestroy} from '@angular/core';
import SockJS from "sockjs-client";
import * as Stomp from "stompjs";
import {BehaviorSubject, EMPTY, filter, Observable, share, Subject, Subscription, switchMap, take} from "rxjs";
import {RoomEvent, RoomEventType} from "../models/room-event";
import {Store} from "@ngrx/store";
import * as RoomAction from "../store/room/room.action";
import {environment} from "../../env/env";
import {RoomDestinations} from "../common/room-destinations";
import {tickHeartbeatInWorker} from "./worker-heartbeat";
import {toTimer} from "../models/room.model";

// Creates the STOMP client the service talks through; tests replace it with a fake client.
export const STOMP_CLIENT_FACTORY = new InjectionToken<() => any>("STOMP client factory", {
  providedIn: "root",
  factory: () => {
    // stompjs takes its heartbeat timers from the Stomp object it puts on window
    const stomp = (window as any).Stomp;
    if (stomp) {
      inject(NgZone).runOutsideAngular(() => tickHeartbeatInWorker(stomp));
    }
    return () => Stomp.over(new SockJS(environment.wsUrl));
  }
});

// Pauses before each new attempt to connect after the connection is lost. The first ones are short,
// so a page that lost the connection for a moment is back before the server gives its seat away.
export const RECONNECT_DELAYS = new InjectionToken<number[]>("Delays before reconnecting", {
  providedIn: "root",
  factory: () => [1000, 2000, 4000, 5000]
});

// How often the browser and the server tell each other they are still there, in milliseconds. The server notices
// a lost connection after two or three missed beats and keeps the seat 10 s more, so someone whose internet is gone
// leaves the table 16-19 s later. A drop shorter than that keeps the connection, or the page connects again in time.
export const HEARTBEAT = 3000;

@Injectable({
  providedIn: 'root'
})
export class RoomWebSocketService implements OnDestroy {

  stompClient: any = null;
  // Emits when a lost connection is back: events sent in between never arrived, so the room has to be loaded again
  readonly reconnected$ = new Subject<void>();
  private connected$ = new BehaviorSubject<boolean>(false);
  private connectedBefore = false;
  private roomSubscription: Subscription | undefined;
  // One subscription to the broker per destination, shared by everyone who watches it
  private readonly watched = new Map<string, Observable<any>>();
  // Receipts of broker subscriptions the broker hasn't confirmed yet. RabbitMQ sets a subscription up a moment after
  // it gets SUBSCRIBE, and a message published to the destination meanwhile doesn't reach it. The server publishes
  // the answer to a request to everyone in the room, so a request sent right after subscribing could lose its answer.
  private readonly unconfirmed$ = new BehaviorSubject<ReadonlySet<string>>(new Set());
  private nextReceipt = 0;
  private failedAttempts = 0;
  private reconnectTimer: any;
  private readonly onOnline = () => this.reconnectNow();
  private readonly onPageHide = (event: PageTransitionEvent) => this.sayPageClosed(event);
  private pageClosedSaid = false;

  constructor(
    private store: Store,
    private zone: NgZone,
    @Inject(STOMP_CLIENT_FACTORY) private createStompClient: () => any,
    @Inject(RECONNECT_DELAYS) private reconnectDelays: number[]
  ) {
    // No need to wait for the next attempt when the browser is back online
    window.addEventListener("online", this.onOnline);
    // Firefox can stop the script that is running while a page closes, and then the page-closed mark is not sent.
    // The scripts after it still run, so two listeners say it: the capturing one runs first, and the other one says it
    // when the first one was stopped. They differ in capture, as Angular calls all listeners of one phase in one script.
    window.addEventListener("pagehide", this.onPageHide, true);
    window.addEventListener("pagehide", this.onPageHide);
  }

  ngOnDestroy() {
    window.removeEventListener("online", this.onOnline);
    window.removeEventListener("pagehide", this.onPageHide, true);
    window.removeEventListener("pagehide", this.onPageHide);
    this.disconnect();
  }

  connect(roomId: string) {
    this.roomSubscription?.unsubscribe();
    this.roomSubscription = this.watch<RoomEvent>(RoomDestinations.roomTopic(roomId))
      .subscribe(event => this.handleEvent(event));
    // Errors are watched while the room is open, so checking a nickname or voting doesn't subscribe and unsubscribe
    // each time. RabbitMQ answers an UNSUBSCRIBE that overtakes its SUBSCRIBE with ERROR, which closes the connection.
    this.roomSubscription.add(this.watch(RoomDestinations.errors).subscribe());
  };

  // Everyone watching a destination shares one subscription to the broker. It is made when the first one starts
  // watching, and UNSUBSCRIBE is sent when the last one stops. So a temporary watcher, like the one waiting for
  // the confirmation of a vote, causes no UNSUBSCRIBE while the room still receives events: RabbitMQ answers
  // an event that reaches a cancelled subscription with ERROR.
  watch<T>(destination: string): Observable<T> {
    this.openConnection();
    let watched = this.watched.get(destination);
    if (!watched) {
      watched = this.connected$.pipe(
        switchMap(connected => !connected ? EMPTY : new Observable<T>(subscriber => {
          const receipt = "subscribed-" + this.nextReceipt++;
          this.unconfirmed$.next(new Set(this.unconfirmed$.value).add(receipt));
          const subscription = this.stompClient.subscribe(destination, (message: any) => {
            this.zone.run(() => subscriber.next(JSON.parse(message.body)));
          }, {receipt});
          return () => {
            if (this.connected$.value) {
              subscription.unsubscribe();
            }
          };
        })),
        share()
      );
      this.watched.set(destination, watched);
    }
    return watched;
  }

  // Subscriptions to application destinations (/app/...) are answered once by the server
  // and are not known to the message broker, so they are dropped locally without UNSUBSCRIBE.
  // An answer still awaited when the connection is lost is lost with it, so the request is made again on the new one.
  // Like a message sent, the request waits for the broker to set up the subscriptions made before, as its errors come there.
  request<T>(destination: string): Observable<T> {
    this.openConnection();
    return this.connected$.pipe(
      switchMap(connected => !connected ? EMPTY : this.subscriptionsSetUp()),
      switchMap(() => new Observable<T>(subscriber => {
        const stompClient = this.stompClient;
        const subscription = stompClient.subscribe(destination, (message: any) => {
          delete stompClient.subscriptions[subscription.id];
          this.zone.run(() => {
            subscriber.next(JSON.parse(message.body));
            subscriber.complete();
          });
        });
        return () => delete stompClient.subscriptions[subscription.id];
      })),
      take(1)
    );
  }

  // Waits until the broker has set up every subscription made before, so the answer reaches the one waiting for it
  send(destination: string, body: any) {
    this.openConnection();
    this.connected$.pipe(
      switchMap(connected => !connected ? EMPTY : this.subscriptionsSetUp()),
      take(1)
    ).subscribe(() => {
      if (typeof body === "string") {
        this.stompClient.send(destination, {}, body);
      } else {
        this.stompClient.send(destination, {"content-type": "application/json"}, JSON.stringify(body));
      }
    });
  }

  handleEvent(event: RoomEvent) {
    switch (event.eventType) {
      case RoomEventType.participantAdded:
        this.store.dispatch(RoomAction.addParticipantSuccess({participant: event.participant!}));
        break;
      case RoomEventType.participantRemoved:
        if (event.participant) {
          this.store.dispatch(RoomAction.removeParticipantSuccess({participant: event.participant}));
        }
        break;
      case RoomEventType.participantRoleChanged:
        this.store.dispatch(RoomAction.roleChanged({participant: event.participant!}));
        break;
      case RoomEventType.voteRemoved:
        if (event.vote) {
          this.store.dispatch(RoomAction.voteRemoved({nickname: event.vote.nickname}));
        }
        break;
      case RoomEventType.voteAdded:
        this.store.dispatch(RoomAction.cardSelectionSuccess({
          participant: {nickname: event.vote!.nickname, watcher: false},
          card: {value: event.vote!.card}
        }));
        break;
      case RoomEventType.showVotes:
        this.store.dispatch(RoomAction.showVotingResultSuccess({round: event.round}));
        break;
      case RoomEventType.clearVotes:
        this.store.dispatch(RoomAction.startNewVotingSuccess({task: event.task}));
        break;
      case RoomEventType.timerStarted:
        this.store.dispatch(RoomAction.timerStarted({timer: toTimer(event.timer!)}));
        break;
      case RoomEventType.timerStopped:
        this.store.dispatch(RoomAction.timerStopped());
        break;
      case RoomEventType.taskChanged:
        this.store.dispatch(RoomAction.taskChanged({task: event.task}));
        break;
      case RoomEventType.estimateAccepted:
        this.store.dispatch(RoomAction.estimateAccepted({round: event.round!}));
        break;
      case RoomEventType.roomClosed:
        this.store.dispatch(RoomAction.closed({roomId: event.roomId}));
        break;
      case RoomEventType.roomRemoved:
        this.store.dispatch(RoomAction.removed({roomId: event.roomId}));
        break;
      default:
        console.log("default");
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.failedAttempts = 0;
    this.roomSubscription?.unsubscribe();
    this.roomSubscription = undefined;
    if (this.stompClient !== null) {
      this.stompClient.disconnect();
      this.stompClient = null;
      this.connected$.next(false);
    }
    this.connectedBefore = false;
  }

  private openConnection() {
    if (this.stompClient !== null) {
      return;
    }
    const stompClient = this.createStompClient();
    stompClient.heartbeat.outgoing = HEARTBEAT;
    stompClient.heartbeat.incoming = HEARTBEAT;
    this.stompClient = stompClient;
    // Receipts asked for on a lost connection never come, and its subscriptions are made again on the new one
    this.unconfirmed$.next(new Set());
    stompClient.onreceipt = (frame: any) => this.zone.run(() => this.confirm(frame.headers["receipt-id"]));
    stompClient.connect({}, () => {
      const reconnected = this.connectedBefore;
      this.connectedBefore = true;
      this.failedAttempts = 0;
      this.zone.run(() => {
        this.connected$.next(true);
        if (reconnected) {
          this.reconnected$.next();
        }
      });
    }, (error: any) => {
      if (this.stompClient !== stompClient) {
        return;
      }
      this.stompClient = null;
      this.zone.run(() => this.connected$.next(false));
      const delay = this.reconnectDelays[Math.min(this.failedAttempts, this.reconnectDelays.length - 1)];
      this.failedAttempts++;
      this.reconnectTimer = setTimeout(() => this.reconnectNow(), delay);
    });
  }

  // Tells the server that the page is being closed or refreshed, so the person leaves the table at once, and a refreshed
  // page brings them back with the vote. Otherwise the server can't tell it from a lost connection and keeps the person
  // at the table for a while. It is sent on the open connection only: a new one would not be ready before the page is
  // gone. A page kept in the back-forward cache can come back, so it says nothing; if its connection is closed
  // meanwhile, the server keeps the seat as for a lost connection.
  private sayPageClosed(event: PageTransitionEvent) {
    if (!event.persisted && !this.pageClosedSaid && this.stompClient !== null && this.connected$.value) {
      this.stompClient.send(RoomDestinations.pageClosed, {}, "");
      this.pageClosedSaid = true;
    }
  }

  // Emits once the broker has confirmed every subscription made so far
  private subscriptionsSetUp(): Observable<unknown> {
    return this.unconfirmed$.pipe(
      filter(unconfirmed => unconfirmed.size === 0),
      take(1)
    );
  }

  private confirm(receipt: string) {
    const unconfirmed = new Set(this.unconfirmed$.value);
    if (unconfirmed.delete(receipt)) {
      this.unconfirmed$.next(unconfirmed);
    }
  }

  private reconnectNow() {
    if (this.reconnectTimer === undefined) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.openConnection();
  }
}
