import {Component, ElementRef, HostListener, OnInit} from '@angular/core';
import {combineLatest, distinctUntilChanged, map, Observable, ReplaySubject} from "rxjs";
import {Card} from "../../models/card.model";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../../store/room/room.selector";
import {currentWatcherSelector} from "../../store/participant/participant.selector";
import {splitIntoRows} from "./deck-rows";

@Component({
  selector: 'app-deck',
  templateUrl: './deck.component.html',
  styleUrls: ['./deck.component.scss']
})
export class DeckComponent implements OnInit {

  watcher$: Observable<boolean> = this.store.pipe(select(currentWatcherSelector));
  // How many cards fit side by side, measured on the page
  private cardsPerRow$ = new ReplaySubject<number>(1);
  rows$: Observable<Card[][]> = combineLatest([
    this.store.pipe(select(RoomSelector.cardsSelector)),
    this.cardsPerRow$.pipe(distinctUntilChanged())
  ]).pipe(map(([cards, cardsPerRow]) => splitIntoRows(cards, cardsPerRow)));

  constructor(
    private store: Store,
    private host: ElementRef<HTMLElement>
  ) {
  }

  // The deck is already on the page here, so it is laid out in rows before it is shown for the first time
  ngOnInit(): void {
    this.measure();
  }

  @HostListener("window:resize")
  measure(): void {
    const style = getComputedStyle(this.host.nativeElement);
    const cardWidth = parseFloat(style.getPropertyValue("--deck-card-width"));
    const gap = parseFloat(style.getPropertyValue("--deck-gap"));
    const width = this.host.nativeElement.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    this.cardsPerRow$.next(Math.max(1, Math.floor((width + gap) / (cardWidth + gap))));
  }
}
