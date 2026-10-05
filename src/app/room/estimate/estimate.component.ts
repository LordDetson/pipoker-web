import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from "@ngrx/store";
import {Observable} from "rxjs";
import * as RoomSelector from "../../store/room/room.selector";
import * as RoomAction from "../../store/room/room.action";
import {HistoryRound} from "../../store/room/room.selector";
import {Card} from "../../models/card.model";

// The estimate the team agrees on after the cards are revealed. The card most people picked is offered at once,
// any card of the deck can be accepted instead, and anyone can change it until a new round starts.
@Component({
  selector: 'app-estimate',
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class EstimateComponent {

  round$: Observable<HistoryRound | undefined> = this.store.select(RoomSelector.revealedRoundSelector);
  cards$: Observable<Card[]> = this.store.select(RoomSelector.cardsSelector);

  constructor(
    private store: Store
  ) {
  }

  accept(round: HistoryRound, card: string): void {
    this.store.dispatch(RoomAction.acceptEstimate({revealedAt: round.revealedAt, card}));
  }
}
