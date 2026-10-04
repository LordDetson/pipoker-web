import {Component, HostListener} from '@angular/core';
import {Observable} from "rxjs";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../../store/room/room.selector";
import {HistoryRound} from "../../store/room/room.selector";
import {I18nService} from "../../i18n/i18n.service";

// The rounds revealed in the room: a button in the corner of the room opens them in a panel over the table
@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css'],
  standalone: false
})
export class HistoryComponent {

  rounds$: Observable<HistoryRound[]> = this.store.pipe(select(RoomSelector.historySelector));
  open = false;

  constructor(
    private store: Store,
    private i18n: I18nService
  ) {
  }

  toggle(): void {
    this.open = !this.open;
  }

  @HostListener("document:keydown.escape")
  close(): void {
    this.open = false;
  }

  // Hours and minutes in the browser's time zone. Angular's date pipe would add its formatting code to the build.
  timeOf(round: HistoryRound): string {
    return new Date(round.revealedAt).toLocaleTimeString(this.i18n.language, {hour: "2-digit", minute: "2-digit"});
  }

  numberOf(index: number, round: HistoryRound): number {
    return round.number;
  }
}
