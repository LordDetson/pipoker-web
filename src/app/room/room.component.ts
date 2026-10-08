import {Component, OnDestroy, OnInit, ChangeDetectionStrategy, Inject, DOCUMENT} from '@angular/core';
import {Room} from "../models/room.model";
import {concat, distinctUntilChanged, filter, map, Observable, of, Subject, switchMap, switchScan, take, takeUntil, timer} from "rxjs";
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
  result = "result",
  leaving = "leaving"
}

export interface Reveal {
  stage: RevealStage;
  // How long the stage moves: the revealed cards turning over, all of them, while the deck gathers and the result is
  // shown, the result sinking away while it leaves
  seconds: number;
}

const VOTING: Reveal = {stage: RevealStage.voting, seconds: 0};

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
  // table are shown turned, so the result comes at once. When a new round starts, the result sinks and fades away
  // like the pile did, and then the deck is dealt out again.
  reveal$: Observable<Reveal> = this.joined$.pipe(
    filter(joined => joined),
    take(1),
    switchMap(() => this.showVotingResult$.pipe(distinctUntilChanged())),
    // Only a result that is shown sinks away: a round started while the cards still turned deals the deck out at once
    switchScan((previous, shown, index) => !shown ? (previous.stage === RevealStage.result ? this.leave() : of(VOTING))
      : index === 0 ? of({stage: RevealStage.result, seconds: 0})
      : this.store.pipe(select(RoomSelector.flipDelaysSelector), take(1), switchMap(delays => {
        // The last card starts turning after the longest delay
        const seconds = Math.max(0, ...delays.values()) + this.flipSeconds();
        return concat(
          of({stage: RevealStage.gathering, seconds}),
          timer(1000 * seconds).pipe(map(() => ({stage: RevealStage.result, seconds})))
        );
      })), VOTING)
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

  // The result sinks away in half the time a card takes to turn over
  private leave(): Observable<Reveal> {
    const seconds = this.flipSeconds() / 2;
    return concat(of({stage: RevealStage.leaving, seconds}), timer(1000 * seconds).pipe(map(() => VOTING)));
  }

  // Both while the result is shown and while it sinks away
  showsResult(reveal: Reveal): boolean {
    return reveal.stage === RevealStage.result || reveal.stage === RevealStage.leaving;
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
