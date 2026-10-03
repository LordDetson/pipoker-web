import {Component, OnDestroy, OnInit} from '@angular/core';
import {Room} from "../models/room.model";
import {Observable, Subject, takeUntil} from "rxjs";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../store/room/room.selector";
import * as RoomAction from "../store/room/room.action";
import {ActivatedRoute} from "@angular/router";
import {RoomStatus} from "../store/room/room-state";
import * as ParticipantAction from "../store/participant/participant.action";
import * as ParticipantSelector from "../store/participant/participant.selector";

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit, OnDestroy {

  roomStatus$: Observable<string> = this.store.pipe(select(RoomSelector.statusSelector));
  joined$: Observable<boolean> = this.store.pipe(select(ParticipantSelector.joinedSelector));
  showVotingResult$: Observable<boolean> = this.store.pipe(select(RoomSelector.showVotingResultSelector));
  ngDestroyed$ = new Subject<void>();

  constructor(
    private store: Store<Room>,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.roomStatus$.pipe(takeUntil(this.ngDestroyed$))
      .subscribe((status: string) => {
        if (status == RoomStatus.pending) {
          const roomId = this.route.snapshot.params['id'];
          this.store.dispatch(RoomAction.get({roomId}));
        }
      });
    window.addEventListener("beforeunload", () => this.store.dispatch(ParticipantAction.destroy()));
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }
}
