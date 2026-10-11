import {AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {combineLatest, map, Observable, ReplaySubject} from "rxjs";
import {Participant, sameNickname} from "../../models/participant.model";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../../store/room/room.selector";
import * as ParticipantSelector from "../../store/participant/participant.selector";
import {Box, Point, seatLayout} from "./seat-layout";

interface Seat extends Point {
  participant: Participant;
}

interface TableView {
  cardSize: number;
  seatWidth: number;
  seats: Seat[];
}

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class TableComponent implements AfterViewInit, OnDestroy {

  @ViewChild("felt", {static: true})
  felt: ElementRef<HTMLElement>;

  // What the room puts in the middle of the table: the status button and the timer or the estimate above it
  @ViewChild("center", {static: true})
  center: ElementRef<HTMLElement>;

  private participants$: Observable<Participant[]> = this.store.pipe(select(RoomSelector.participantsSelector));
  watchers$: Observable<Participant[]> = this.participants$.pipe(
    map(participants => participants.filter(participant => participant.watcher)));
  // The table fits the space the page gives it, so people are seated once it is measured, and kept clear of the controls
  // in the middle of it. The ResizeObserver reports the sizes before the table is first painted, so the seats appear
  // at their places and sizes right away.
  private tableSize$ = new ReplaySubject<{ width: number, height: number, controls?: Box }>(1);
  table$: Observable<TableView> = combineLatest([
    this.participants$,
    this.store.pipe(select(ParticipantSelector.currentParticipantSelector)),
    this.tableSize$
  ]).pipe(map(([participants, viewer, size]) => {
    const voters = seatingOrder(participants, viewer);
    const layout = seatLayout(voters.length, size.width, size.height, size.controls);
    return {
      cardSize: layout.cardSize,
      seatWidth: layout.seatWidth,
      seats: voters.map((participant, index) => ({participant, ...layout.seats[index]}))
    };
  }));
  // Watches the table and each of the controls, which change their size when the timer starts or the cards are revealed
  private resizeObserver = new ResizeObserver(() => {
    const felt = this.felt.nativeElement;
    const width = felt.clientWidth;
    const height = felt.clientHeight;
    // A table that is not shown has no size, and nothing to seat people at
    if (width > 0 && height > 0) {
      const controls = this.controlsBox();
      this.ngZone.run(() => this.tableSize$.next({width, height, controls}));
    }
  });

  constructor(
    private store: Store,
    private ngZone: NgZone
  ) {
  }

  ngAfterViewInit(): void {
    this.resizeObserver.observe(this.felt.nativeElement);
    for (const control of this.controls()) {
      this.resizeObserver.observe(control);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  nicknameOf(index: number, seat: Seat): string {
    return seat.participant.nickname;
  }

  // The controls are the elements the room puts in the middle of the table and the parts of each of them: the timer and
  // the estimate are placed out of the flow, above the button
  private controls(): Element[] {
    return Array.from(this.center.nativeElement.querySelectorAll(":scope > *, :scope > * > *"));
  }

  // The box around the controls that are shown, in pixels from the top left corner of the felt
  private controlsBox(): Box | undefined {
    const felt = this.felt.nativeElement;
    const origin = felt.getBoundingClientRect();
    const left = origin.left + felt.clientLeft;
    const top = origin.top + felt.clientTop;
    return this.controls()
      .map(control => control.getBoundingClientRect())
      .filter(rect => rect.width > 0 && rect.height > 0)
      .reduce<Box | undefined>((box, rect) => ({
        left: Math.min(box?.left ?? Infinity, rect.left - left),
        top: Math.min(box?.top ?? Infinity, rect.top - top),
        right: Math.max(box?.right ?? -Infinity, rect.right - left),
        bottom: Math.max(box?.bottom ?? -Infinity, rect.bottom - top)
      }), undefined);
  }
}

// Everyone who votes sits at the table in the order they joined, and the person looking at the page sits first:
// at the bottom, in front of their deck. Watchers have no cards and are listed apart from the table.
function seatingOrder(participants: Participant[], viewer: Participant | undefined): Participant[] {
  const voters = participants.filter(participant => !participant.watcher);
  const viewerIndex = voters.findIndex(voter => viewer !== undefined && sameNickname(voter.nickname, viewer.nickname));
  return viewerIndex < 0 ? voters : [...voters.slice(viewerIndex), ...voters.slice(0, viewerIndex)];
}
