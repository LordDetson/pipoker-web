import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {Room} from "../models/room.model";
import {filter, Observable, Subject, take, takeUntil} from "rxjs";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../store/room/room.selector";
import * as RoomAction from "../store/room/room.action";
import {ActivatedRoute, Router} from "@angular/router";
import {RoomStatus} from "../store/room/room-state";
import * as ParticipantAction from "../store/participant/participant.action";
import * as ParticipantSelector from "../store/participant/participant.selector";
import {SeatStorage} from "../common/seat-storage";
import {JOIN_RIGHT_AWAY} from "../common/invitation-link";

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
  gone$: Observable<RoomStatus.closed | RoomStatus.missing | undefined> = this.store.pipe(select(RoomSelector.goneSelector));
  readonly RoomStatus = RoomStatus;
  ngDestroyed$ = new Subject<void>();
  // Set when the room was opened from the start page with a nickname already typed there. Only the join form shown
  // before the person first gets a seat uses it: one shown again after a long connection loss waits as usual
  joinRightAway: boolean;

  constructor(
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

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }
}
