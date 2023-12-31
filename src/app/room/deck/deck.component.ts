import {Component} from '@angular/core';
import {Observable} from "rxjs";
import {Card} from "../../models/card.model";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../../store/room/room.selector";
import {currentWatcherSelector} from "../../store/participant/participant.selector";

@Component({
  selector: 'app-deck',
  templateUrl: './deck.component.html',
  styleUrls: ['./deck.component.scss']
})
export class DeckComponent {

  cards$: Observable<Card[]> = this.store.pipe(select(RoomSelector.cardsSelector));
  watcher$: Observable<boolean> = this.store.pipe(select(currentWatcherSelector));

  constructor(
    private store: Store
  ) {
  }
}
