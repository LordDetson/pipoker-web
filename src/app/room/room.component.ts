import {Component, OnDestroy, OnInit, ChangeDetectionStrategy, Inject, DOCUMENT} from '@angular/core';
import {Room} from "../models/room.model";
import {combineLatest, concat, distinctUntilChanged, filter, map, Observable, of, Subject, switchMap, take, takeUntil, timer} from "rxjs";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../store/room/room.selector";
import * as RoomAction from "../store/room/room.action";
import {ActivatedRoute, Router} from "@angular/router";
import {RoomStatus} from "../store/room/room-state";
import * as ParticipantAction from "../store/participant/participant.action";
import * as ParticipantSelector from "../store/participant/participant.selector";
import {SeatStorage} from "../common/seat-storage";
import {JOIN_RIGHT_AWAY} from "../common/invitation-link";

export enum RevealStage {
  voting = "voting",
  gathering = "gathering",
  result = "result"
}

export interface Reveal {
  stage: RevealStage;
  // How long the revealed cards take to turn over, all of them
  seconds: number;
}

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class RoomComponent implements OnInit, OnDestroy {

  roomStatus$: Observable<string> = this.store.pipe(select(RoomSelector.statusSelector));
  joined$: Observable<boolean> = this.store.pipe(select(ParticipantSelector.joinedSelector));
  returning$: Observable<boolean> = this.store.pipe(select(ParticipantSelector.returningSelector));
  watcher$: Observable<boolean> = this.store.pipe(select(ParticipantSelector.currentWatcherSelector));
  showVotingResult$: Observable<boolean> = this.store.pipe(select(RoomSelector.showVotingResultSelector));
  // While the revealed cards turn over, the deck gathers into a pile, which then sinks and fades away; the result
  // takes its place once the last card has turned. Cards that are already revealed when the person gets to the
  // table are shown turned, so the result comes at once.
  reveal$: Observable<Reveal> = this.joined$.pipe(
    filter(joined => joined),
    take(1),
    switchMap(() => this.showVotingResult$.pipe(distinctUntilChanged())),
    switchMap((shown, index) => !shown ? of({stage: RevealStage.voting, seconds: 0})
      : index === 0 ? of({stage: RevealStage.result, seconds: 0})
      : this.store.pipe(select(RoomSelector.flipDelaysSelector), take(1), switchMap(delays => {
        // The last card starts turning after the longest delay
        const seconds = Math.max(0, ...delays.values()) + this.flipSeconds();
        return concat(
          of({stage: RevealStage.gathering, seconds}),
          timer(1000 * seconds).pipe(map(() => ({stage: RevealStage.result, seconds})))
        );
      })))
  );
  readonly RevealStage = RevealStage;
  gone$: Observable<RoomStatus.closed | RoomStatus.missing | undefined> = this.store.pipe(select(RoomSelector.goneSelector));
  readonly RoomStatus = RoomStatus;
  ngDestroyed$ = new Subject<void>();
  // Set when the room was opened from the start page with a nickname already typed there. Only the join form shown
  // before the person first gets a seat uses it: one shown again after a long connection loss waits as usual
  joinRightAway: boolean;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private store: Store<Room>,
    private route: ActivatedRoute,
    router: Router
  ) {
    // The room is created while the router opens it, so the navigation that brought the person here is still current
    this.joinRightAway = router.currentNavigation()?.extras.state?.[JOIN_RIGHT_AWAY] === true;
  }

  ngOnInit(): void {
    const roomId = this.route.snapshot.params['id'];
    this.roomStatus$.pipe(takeUntil(this.ngDestroyed$))
      .subscribe((status: string) => {
        if (status == RoomStatus.pending) {
          this.store.dispatch(RoomAction.get({roomId}));
        }
      });
    // A tab that remembers its seat takes it back instead of joining again. Closing or refreshing the page is
    // reported by RoomWebSocketService: the server takes the person away from the table at once, but keeps the seat
    // and the vote, so a refreshed page brings them back. When the seat is gone, the join form offers the nickname.
    this.joined$.pipe(take(1)).subscribe(joined => {
      const seat = SeatStorage.find(roomId);
      if (!joined && seat) {
        this.store.dispatch(ParticipantAction.returnToSeat({roomId, participant: seat}));
      }
    });
    this.joined$.pipe(filter(joined => joined), take(1), takeUntil(this.ngDestroyed$))
      .subscribe(() => this.joinRightAway = false);
  }

  // How long a card takes to turn over, the transition of the page (none until the page has started)
  private flipSeconds(): number {
    return parseFloat(getComputedStyle(this.document.documentElement).getPropertyValue("--common-transition-duration")) || 0;
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }
}
