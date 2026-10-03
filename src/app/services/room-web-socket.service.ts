import {inject, Inject, Injectable, InjectionToken, NgZone, OnDestroy} from '@angular/core';
import * as SockJS from "sockjs-client";
import * as Stomp from "stompjs";
import {BehaviorSubject, EMPTY, filter, Observable, Subject, Subscription, switchMap, take} from "rxjs";
import {RoomEvent, RoomEventType} from "../models/room-event";
import {Store} from "@ngrx/store";
import * as RoomAction from "../store/room/room.action";
import {environment} from "../../env/env";
import {RoomDestinations} from "../common/room-destinations";
import {tickHeartbeatInWorker} from "./worker-heartbeat";

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
  private failedAttempts = 0;
  private reconnectTimer: any;
  private readonly onOnline = () => this.reconnectNow();

  constructor(
    private store: Store,
    private zone: NgZone,
    @Inject(STOMP_CLIENT_FACTORY) private createStompClient: () => any,
    @Inject(RECONNECT_DELAYS) private reconnectDelays: number[]
  ) {
    // No need to wait for the next attempt when the browser is back online
    window.addEventListener("online", this.onOnline);
  }

  ngOnDestroy() {
    window.removeEventListener("online", this.onOnline);
    this.disconnect();
  }

  connect(roomId: string) {
    this.roomSubscription?.unsubscribe();
    this.roomSubscription = this.watch<RoomEvent>(RoomDestinations.roomTopic(roomId))
      .subscribe(event => this.handleEvent(event));
  };

  watch<T>(destination: string): Observable<T> {
    this.openConnection();
    return this.connected$.pipe(
      switchMap(connected => !connected ? EMPTY : new Observable<T>(subscriber => {
        const subscription = this.stompClient.subscribe(destination, (message: any) => {
          this.zone.run(() => subscriber.next(JSON.parse(message.body)));
        });
        return () => {
          if (this.connected$.value) {
            subscription.unsubscribe();
          }
        };
      }))
    );
  }

  // Subscriptions to application destinations (/app/...) are answered once by the server
  // and are not known to the message broker, so they are dropped locally without UNSUBSCRIBE.
  request<T>(destination: string): Observable<T> {
    this.openConnection();
    return this.connected$.pipe(
      filter(connected => connected),
      take(1),
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
      }))
    );
  }

  send(destination: string, body: any) {
    this.openConnection();
    this.connected$.pipe(
      filter(connected => connected),
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
      case RoomEventType.voteAdded:
        this.store.dispatch(RoomAction.cardSelectionSuccess({
          participant: {nickname: event.vote!.nickname, watcher: false},
          card: {value: event.vote!.card}
        }));
        break;
      case RoomEventType.showVotes:
        this.store.dispatch(RoomAction.showVotingResultSuccess());
        break;
      case RoomEventType.clearVotes:
        this.store.dispatch(RoomAction.startNewVotingSuccess());
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
    this.stompClient = stompClient;
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

  private reconnectNow() {
    if (this.reconnectTimer === undefined) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.openConnection();
  }
}
