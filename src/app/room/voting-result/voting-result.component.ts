import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from "@ngrx/store";
import {Observable, map} from "rxjs";
import * as RoomSelector from "../../store/room/room.selector";
import {HistoryRound, Tally} from "../../store/room/room.selector";

const MAX_LAYERS = 4;

export interface VotingResultView {
  // How many picked each card, in the order of the deck
  tally: Tally[];
  // The most votes a card got
  most: number;
  total: number;
  // The cards that got the most votes, more than one when the votes split
  leaders: string[];
  // The share of the votes the leading card got, in whole percent
  agreement: number;
}

export function votingResultView(round: HistoryRound): VotingResultView {
  const total = round.tally.reduce((sum, entry) => sum + entry.count, 0);
  const most = Math.max(...round.tally.map(entry => entry.count));
  return {
    tally: round.tally,
    most,
    total,
    leaders: round.tally.filter(entry => entry.count === most).map(entry => entry.card),
    agreement: Math.round(100 * most / total)
  };
}

// The votes of the revealed round in place of the deck: the leading card and how much the team agrees, a pile of
// cards for every picked card in the order of the deck, and how far the votes spread.
@Component({
  selector: 'app-voting-result',
  templateUrl: './voting-result.component.html',
  styleUrls: ['./voting-result.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class VotingResultComponent {

  result$: Observable<VotingResultView | undefined> = this.store.select(RoomSelector.revealedRoundSelector)
    .pipe(map(round => round && votingResultView(round)));

  constructor(
    private store: Store
  ) {
  }

  cardOf(index: number, entry: Tally): string {
    return entry.card;
  }

  // A pile shows a card for each vote, up to a few: the count under it says the rest
  layers(count: number): number[] {
    return Array.from({length: Math.min(count, MAX_LAYERS)}, (_, index) => index);
  }
}
