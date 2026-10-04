import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {Store} from "@ngrx/store";
import {filter, map, Observable, switchMap, take, tap} from "rxjs";
import {VotingResult} from "../../models/voting-result.model";
import * as RoomSelector from "../../store/room/room.selector";
import * as RoomAction from "../../store/room/room.action";

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html',
  styleUrls: ['./buttons.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ButtonsComponent {

  votingResult$: Observable<VotingResult> = this.store.select(RoomSelector.votingResultSelector);
  voted$: Observable<boolean> = this.votingResult$.pipe(map(votingResult => votingResult.map.size != 0));
  showVotingResult$: Observable<boolean> = this.store.select(RoomSelector.showVotingResultSelector);

  constructor(
    private store: Store
  ) {
  }

  mainBtnClick() {
    this.voted$.pipe(
      take(1),
      filter(voted => voted),
      switchMap(() => this.showVotingResult$.pipe(take(1))),
      tap(showVotingResult => {
          if (!showVotingResult) {
            this.store.dispatch(RoomAction.showVotingResult());
          } else {
            this.store.dispatch(RoomAction.startNewVoting());
          }
        }
      )
    ).subscribe();
  }
}
