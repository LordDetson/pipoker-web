import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {Room} from "../models/room.model";
import {Observable, Subject, take, takeUntil} from "rxjs";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../store/room/room.selector";
import * as RoomAction from "../store/room/room.action";
import {ActivatedRoute} from "@angular/router";
import {RoomStatus} from "../store/room/room-state";
import * as ParticipantAction from "../store/participant/participant.action";
import * as ParticipantSelector from "../store/participant/participant.selector";
import {SeatStorage} from "../common/seat-storage";
import {loadDoughnutChart} from "./voting-result-chart/voting-result-chart.component";

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

  constructor(
    private store: Store<Room>,
    private route: ActivatedRoute
  ) {
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
    // The chart of the votes is loaded while people vote, so it is ready when the cards are revealed.
    // If loading fails now, the chart tries again when it is shown.
    loadDoughnutChart().catch(() => undefined);
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }
}
