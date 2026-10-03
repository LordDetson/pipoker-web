import {Injectable, NgZone} from '@angular/core';
import * as SockJS from "sockjs-client";
import * as Stomp from "stompjs";
import {BehaviorSubject, EMPTY, filter, Observable, Subscription, switchMap, take} from "rxjs";
import {RoomEvent, RoomEventType} from "../models/room-event";
import {Store} from "@ngrx/store";
import * as RoomAction from "../store/room/room.action";
import {environment} from "../../env/env";
import {RoomDestinations} from "../common/room-destinations";

@Injectable({
  providedIn: 'root'
})
export class RoomWebSocketService {

  stompClient: any = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private roomSubscription: Subscription | undefined;

  constructor(
    private store: Store,
    private zone: NgZone
  ) {
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
    this.roomSubscription?.unsubscribe();
    this.roomSubscription = undefined;
    if (this.stompClient !== null) {
      this.stompClient.disconnect();
      this.stompClient = null;
      this.connected$.next(false);
    }
  }

  private openConnection() {
    if (this.stompClient !== null) {
      return;
    }
    const stompClient = Stomp.over(new SockJS(environment.wsUrl));
    this.stompClient = stompClient;
    stompClient.connect({}, () => {
      this.zone.run(() => this.connected$.next(true));
    }, (error: any) => {
      if (this.stompClient !== stompClient) {
        return;
      }
      this.stompClient = null;
      this.zone.run(() => this.connected$.next(false));
      setTimeout(() => this.openConnection(), 5000);
    });
  }
}
