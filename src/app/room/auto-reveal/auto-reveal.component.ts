import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from "@ngrx/store";
import {Observable, take} from "rxjs";
import * as RoomAction from "../../store/room/room.action";
import * as RoomSelector from "../../store/room/room.selector";

// The switch under the main button that makes the server reveal the cards by itself once everyone has voted
@Component({
  selector: 'app-auto-reveal',
  templateUrl: './auto-reveal.component.html',
  styleUrls: ['./auto-reveal.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AutoRevealComponent {

  autoReveal$: Observable<boolean> = this.store.select(RoomSelector.autoRevealSelector);

  constructor(
    private store: Store
  ) {
  }

  // Anyone in the room can change it, so the switch shows what the room has and moves when everyone hears about
  // the change rather than on the click
  toggle(event: Event): void {
    event.preventDefault();
    this.autoReveal$.pipe(take(1))
      .subscribe(autoReveal => this.store.dispatch(RoomAction.setAutoReveal({autoReveal: !autoReveal})));
  }
}
