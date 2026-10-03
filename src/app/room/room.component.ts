import {Component, OnDestroy, OnInit} from '@angular/core';
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

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit, OnDestroy {

  roomStatus$: Observable<string> = this.store.pipe(select(RoomSelector.statusSelector));
  joined$: Observable<boolean> = this.store.pipe(select(ParticipantSelector.joinedSelector));
  returning$: Observable<boolean> = this.store.pipe(select(ParticipantSelector.returningSelector));
  showVotingResult$: Observable<boolean> = this.store.pipe(select(RoomSelector.showVotingResultSelector));
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
    // After a page refresh this tab takes its seat back instead of joining again.
    // Closing the tab is not reported: the server lets the seat go once the connection is gone for a few seconds.
    this.joined$.pipe(take(1)).subscribe(joined => {
      const seat = SeatStorage.find(roomId);
      if (!joined && seat) {
        this.store.dispatch(ParticipantAction.returnToSeat({roomId, participant: seat}));
      }
    });
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }
}
