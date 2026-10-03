import {Injectable} from "@angular/core";
import {Actions, createEffect, ofType} from "@ngrx/effects";
import {RoomService} from "../../services/room.service";
import {Router} from "@angular/router";
import {Store} from "@ngrx/store";
import * as ParticipantAction from "./participant.action";
import {mergeMap, of, withLatestFrom} from "rxjs";
import * as RoomAction from "../room/room.action";
import * as RoomSelector from "../room/room.selector";
import * as ParticipantSelector from "./participant.selector";

@Injectable()
export class ParticipantEffect {

  destroy$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ParticipantAction.destroy),
      withLatestFrom(
        this.store.select(RoomSelector.idSelector),
        this.store.select(ParticipantSelector.currentParticipantSelector)
      ),
      mergeMap(([action, roomId, participant]) => {
        // Someone who opened the link and left without joining has nobody to remove
        if (participant) {
          this.store.dispatch(RoomAction.removeParticipant({roomId, participant}));
        }
        return of(ParticipantAction.destroySuccess());
      })
    )
  );

  constructor(
    private actions$: Actions,
    private roomService: RoomService,
    private router: Router,
    private store: Store
  ) {
  }
}
