import {AfterViewInit, Component, ElementRef, HostBinding, HostListener, Input, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {combineLatest, distinctUntilChanged, map, Observable, ReplaySubject} from "rxjs";
import {Card} from "../../models/card.model";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../../store/room/room.selector";
import {currentWatcherSelector} from "../../store/participant/participant.selector";
import {splitIntoRows} from "./deck-rows";

// How long a card takes to be dealt out of the pile, and how much later the next card starts
const DEAL_SECONDS = 0.6;
const DEAL_STEP_SECONDS = 0.03;

@Component({
  selector: 'app-deck',
  templateUrl: './deck.component.html',
  styleUrls: ['./deck.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DeckComponent implements OnInit, AfterViewInit, OnDestroy {

  watcher$: Observable<boolean> = this.store.pipe(select(currentWatcherSelector));
  // How many cards fit side by side, measured on the page
  private cardsPerRow$ = new ReplaySubject<number>(1);
  rows$: Observable<Card[][]> = combineLatest([
    this.store.pipe(select(RoomSelector.cardsSelector)),
    this.cardsPerRow$.pipe(distinctUntilChanged())
  ]).pipe(map(([cards, cardsPerRow]) => splitIntoRows(cards, cardsPerRow)));

  // Set while the revealed cards turn over: every card of the deck moves to the middle of the deck, and the pile
  // then sinks and fades away by the time the last card has turned, see --reveal-duration. The result then takes the
  // deck's place, and the deck is dealt back out of the pile for the next round.
  @HostBinding("class.gathering")
  gatheringCards = false;
  private dealt?: ReturnType<typeof setTimeout>;

  @Input()
  set gathering(gathering: boolean) {
    if (gathering && !this.gatheringCards) {
      this.stopDealing();
      this.aimAtMiddle();
    } else if (!gathering && this.gatheringCards) {
      this.deal();
    }
    this.gatheringCards = gathering;
  }

  constructor(
    private store: Store,
    private host: ElementRef<HTMLElement>
  ) {
  }

  // Deals the cards out of a pile in the middle of the deck one shortly after another, see .dealing. Gathered cards
  // already lie in the pile; any others are put there first, and the browser lays them out there before they move.
  private deal(): void {
    const host = this.host.nativeElement;
    const cards = host.querySelectorAll("app-deck-card").length;
    if (!this.gatheringCards) {
      this.aimAtMiddle();
      host.classList.add("piled");
      // Lays the cards out in the pile, so they move from there
      host.getBoundingClientRect();
      host.classList.remove("piled");
    }
    host.style.setProperty("--deal-duration", DEAL_SECONDS + "s");
    host.style.setProperty("--deal-step", DEAL_STEP_SECONDS + "s");
    host.classList.add("dealing");
    clearTimeout(this.dealt);
    // Afterwards the cards move as usual again
    this.dealt = setTimeout(() => this.stopDealing(), 1000 * (DEAL_SECONDS + DEAL_STEP_SECONDS * cards));
  }

  private stopDealing(): void {
    clearTimeout(this.dealt);
    this.host.nativeElement.classList.remove("dealing");
  }

  // Tells every card how far it is from the middle of the deck and how much it turns in the pile
  private aimAtMiddle(): void {
    const deck = this.host.nativeElement.getBoundingClientRect();
    const middleX = deck.left + deck.width / 2;
    const middleY = deck.top + deck.height / 2;
    this.host.nativeElement.querySelectorAll<HTMLElement>("app-deck-card").forEach((card, index) => {
      const place = card.getBoundingClientRect();
      card.style.setProperty("--gather-x", middleX - (place.left + place.width / 2) + "px");
      card.style.setProperty("--gather-y", middleY - (place.top + place.height / 2) + "px");
      card.style.setProperty("--gather-turn", (index * 7 % 5 - 2) * 4 + "deg");
      card.style.setProperty("--gather-order", String(index));
    });
  }

  // The deck is already on the page here, so it is laid out in rows before it is shown for the first time
  ngOnInit(): void {
    this.measure();
  }

  // A person who comes to the table gets the deck dealt the same way as a new round. A deck that comes while the
  // result is shown is gathered at once, out of sight, to be dealt for the next round.
  ngAfterViewInit(): void {
    if (this.gatheringCards) {
      this.aimAtMiddle();
    } else {
      this.deal();
    }
  }

  @HostListener("window:resize")
  measure(): void {
    const style = getComputedStyle(this.host.nativeElement);
    const cardWidth = parseFloat(style.getPropertyValue("--deck-card-width"));
    const gap = parseFloat(style.getPropertyValue("--deck-gap"));
    const width = this.host.nativeElement.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    this.cardsPerRow$.next(Math.max(1, Math.floor((width + gap) / (cardWidth + gap))));
  }

  ngOnDestroy(): void {
    clearTimeout(this.dealt);
  }
}
