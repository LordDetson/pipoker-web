import {AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild} from '@angular/core';
import {combineLatest, map, Observable, ReplaySubject} from "rxjs";
import {Participant, sameNickname} from "../../models/participant.model";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../../store/room/room.selector";
import * as ParticipantSelector from "../../store/participant/participant.selector";
import {Point, seatLayout} from "./seat-layout";

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
  styleUrls: ['./table.component.css']
})
export class TableComponent implements AfterViewInit, OnDestroy {

  @ViewChild("felt", {static: true})
  felt: ElementRef<HTMLElement>;

  private participants$: Observable<Participant[]> = this.store.pipe(select(RoomSelector.participantsSelector));
  watchers$: Observable<Participant[]> = this.participants$.pipe(
    map(participants => participants.filter(participant => participant.watcher)));
  // The table fits the space the page gives it, so people are seated once it is measured. The ResizeObserver reports
  // the size before the table is first painted, so the seats appear at their places and sizes right away.
  private tableSize$ = new ReplaySubject<{ width: number, height: number }>(1);
  table$: Observable<TableView> = combineLatest([
    this.participants$,
    this.store.pipe(select(ParticipantSelector.currentParticipantSelector)),
    this.tableSize$
  ]).pipe(map(([participants, viewer, size]) => {
    const voters = seatingOrder(participants, viewer);
    const layout = seatLayout(voters.length, size.width, size.height);
    return {
      cardSize: layout.cardSize,
      seatWidth: layout.seatWidth,
      seats: voters.map((participant, index) => ({participant, ...layout.seats[index]}))
    };
  }));
  private resizeObserver = new ResizeObserver(([entry]) => {
    const {width, height} = entry.contentRect;
    // A table that is not shown has no size, and nothing to seat people at
    if (width > 0 && height > 0) {
      this.ngZone.run(() => this.tableSize$.next({width, height}));
    }
  });

  constructor(
    private store: Store,
    private ngZone: NgZone
  ) {
  }

  ngAfterViewInit(): void {
    this.resizeObserver.observe(this.felt.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  nicknameOf(index: number, seat: Seat): string {
    return seat.participant.nickname;
  }
}

// Everyone who votes sits at the table in the order they joined, and the person looking at the page sits first:
// at the bottom, in front of their deck. Watchers have no cards and are listed apart from the table.
function seatingOrder(participants: Participant[], viewer: Participant | undefined): Participant[] {
  const voters = participants.filter(participant => !participant.watcher);
  const viewerIndex = voters.findIndex(voter => viewer !== undefined && sameNickname(voter.nickname, viewer.nickname));
  return viewerIndex < 0 ? voters : [...voters.slice(viewerIndex), ...voters.slice(0, viewerIndex)];
}
