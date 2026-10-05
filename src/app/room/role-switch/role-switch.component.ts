import {ChangeDetectionStrategy, Component} from '@angular/core';
import {select, Store} from "@ngrx/store";
import {Observable, take} from "rxjs";
import * as RoomAction from "../../store/room/room.action";
import {currentWatcherSelector} from "../../store/participant/participant.selector";

// The switch in the corner of the room that makes the person a watcher or a voter at any moment
@Component({
  selector: 'app-role-switch',
  templateUrl: './role-switch.component.html',
  styleUrls: ['./role-switch.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class RoleSwitchComponent {

  watcher$: Observable<boolean> = this.store.pipe(select(currentWatcherSelector));

  constructor(
    private store: Store
  ) {
  }

  // The switch shows the role the room has for the person, so it moves when everyone hears about the change
  // rather than on the click
  toggle(event: Event): void {
    event.preventDefault();
    this.watcher$.pipe(take(1)).subscribe(watcher => this.store.dispatch(RoomAction.changeRole({watcher: !watcher})));
  }
}
