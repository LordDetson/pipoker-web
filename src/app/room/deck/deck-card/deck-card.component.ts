import {Component, HostBinding, Input, OnDestroy, OnInit} from '@angular/core';
import {Store} from "@ngrx/store";
import * as RoomAction from "../../../store/room/room.action";
import {Participant} from "../../../models/participant.model";
import {Card} from "../../../models/card.model";
import {map, Observable, Subject, take, takeUntil, tap} from "rxjs";
import * as ParticipantAction from "../../../store/participant/participant.selector";

@Component({
  selector: 'app-deck-card',
  templateUrl: './deck-card.component.html',
  styleUrls: ['./deck-card.component.scss'],
  host: {
    class: "card common-transition"
  }
})
export class DeckCardComponent implements OnInit, OnDestroy {

  @Input()
  card: Card;

  participant$: Observable<Participant> = this.store.select(ParticipantAction.currentParticipantSelector);
  selectedCard$: Observable<Card | undefined> = this.store.select(ParticipantAction.selectedCardSelector);
  selected$: Observable<boolean> = this.selectedCard$.pipe(map(selectedCard => selectedCard?.value === this.card.value));
  selected: boolean;
  ngDestroyed$ = new Subject<void>();

  constructor(
    private store: Store
  ) {
  }

  ngOnInit(): void {
    // The deck rebuilds its rows when the window is resized, so a card may be destroyed while the room lives on
    this.selected$.pipe(takeUntil(this.ngDestroyed$)).subscribe(value => this.selected = value);
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }

  select() {
    this.participant$.pipe(
      take(1),
      tap(participant => {
        this.store.dispatch(RoomAction.selectCard({
            participant,
            card: this.card
          }
        ));
      })
    ).subscribe();
  }

  @HostBinding('class.selected')
  get isSelected(): boolean {
    return this.selected;
  }

  @HostBinding('class.bg-body-secondary')
  get isNotSelected(): boolean {
    return !this.selected;
  }

  @HostBinding('style.--value-length')
  get valueLength(): number {
    return this.card.value.length;
  }
}
