import {Component, NgZone} from '@angular/core';
import {Store} from "@ngrx/store";
import {map, Observable, of, switchMap} from "rxjs";
import {RoomTimer} from "../../models/room.model";
import * as RoomSelector from "../../store/room/room.selector";
import * as RoomAction from "../../store/room/room.action";
import {TimerSignal} from "./timer-signal";

// The lengths of the timer to choose from, in minutes
export const TIMER_MINUTES = [1, 2, 3, 5, 10];
// The last seconds are shown in a warning color
const WARNING_SECONDS = 10;
// How often the time left is checked, in milliseconds: often enough that the shown second changes on every page together
const CHECK_INTERVAL = 200;

@Component({
  selector: 'app-timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.css']
})
export class TimerComponent {

  readonly minutes = TIMER_MINUTES;
  readonly warningSeconds = WARNING_SECONDS;
  // While a timer runs: the seconds left, zero once the time is up
  countdown$: Observable<{ left: number } | undefined> = this.store.select(RoomSelector.timerSelector).pipe(
    switchMap(timer => timer ? this.secondsLeft(timer).pipe(map(left => ({left}))) : of(undefined))
  );

  constructor(
    private store: Store,
    private ngZone: NgZone,
    private signal: TimerSignal
  ) {
  }

  start(minutes: number) {
    this.store.dispatch(RoomAction.startTimer({seconds: minutes * 60}));
  }

  stop() {
    this.store.dispatch(RoomAction.stopTimer());
  }

  // Minutes and seconds, like 2:05
  format(seconds: number): string {
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  }

  // Counts down to the end of the timer, and sounds the signal when the time runs out while the page is open.
  // A page that opens the room after that shows the end without the sound. The checks run outside Angular,
  // so the page is updated once a second rather than on every check.
  private secondsLeft(timer: RoomTimer): Observable<number> {
    return new Observable<number>(subscriber => {
      let shown: number | undefined;
      const check = () => {
        const left = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
        if (left === shown) {
          return;
        }
        if (left === 0 && shown !== undefined) {
          this.signal.ring();
        }
        shown = left;
        this.ngZone.run(() => subscriber.next(left));
        if (left === 0) {
          subscriber.complete();
        }
      };
      const interval = this.ngZone.runOutsideAngular(() => setInterval(check, CHECK_INTERVAL));
      check();
      return () => clearInterval(interval);
    });
  }
}
