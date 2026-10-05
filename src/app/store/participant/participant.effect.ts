import {Injectable} from "@angular/core";
import {Actions, createEffect, ofType} from "@ngrx/effects";
import {RoomService} from "../../services/room.service";
import {Router} from "@angular/router";
import {Store} from "@ngrx/store";
import * as ParticipantAction from "./participant.action";
import {catchError, concat, filter, map, mergeMap, of, switchMap, tap, timeout, withLatestFrom} from "rxjs";
import * as RoomAction from "../room/room.action";
import * as RoomSelector from "../room/room.selector";
import * as ParticipantSelector from "./participant.selector";
import {SeatStorage} from "../../common/seat-storage";
import {AppConstants} from "../../common/app-constants";
import {sameNickname} from "../../models/participant.model";

// How long to wait for the server to give the seat back before asking for the nickname again
export const RETURN_TIMEOUT = 15000;

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
        SeatStorage.remove(roomId);
        return of(ParticipantAction.destroySuccess());
      })
    )
  );

  rememberSeat$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ParticipantAction.initSuccess),
        withLatestFrom(this.store.select(RoomSelector.idSelector)),
        tap(([{participant}, roomId]) => SeatStorage.save(roomId, participant))
      ),
    {dispatch: false}
  );

  // The tab takes its seat back with the new role after a reload, and the next room the person joins or creates
  // offers the role they chose last, like the checkbox on the join form does
  rememberRole$ = createEffect(() =>
      this.actions$.pipe(
        ofType(RoomAction.roleChanged),
        withLatestFrom(
          this.store.select(RoomSelector.idSelector),
          this.store.select(ParticipantSelector.currentParticipantSelector)
        ),
        filter(([{participant}, , current]) => !!current && sameNickname(participant.nickname, current.nickname)),
        tap(([, roomId, current]) => {
          SeatStorage.save(roomId, current);
          localStorage.setItem(AppConstants.lastWatcher, current.watcher.toString());
        })
      ),
    {dispatch: false}
  );

  returnToSeat$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ParticipantAction.returnToSeat),
      switchMap(({roomId, participant}) =>
        this.roomService.returnParticipant(roomId, participant).pipe(
          timeout(RETURN_TIMEOUT),
          switchMap(returned => concat(
            of(ParticipantAction.initSuccess({participant: returned})),
            // The room as it is now, with the participant's own vote
            this.roomService.get(roomId).pipe(
              map(room => RoomAction.refreshSuccess({room})),
              catchError(error => of(RoomAction.initFailure({error})))
            )
          )),
          catchError(() => of(ParticipantAction.seatLost({roomId, participant})))
        )
      )
    )
  );

  // The join form shows the nickname and the role the person had, so they can join again with one click
  forgetSeat$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ParticipantAction.seatLost),
        tap(({roomId, participant}) => {
          SeatStorage.remove(roomId);
          localStorage.setItem(AppConstants.lastNickname, participant.nickname);
          localStorage.setItem(AppConstants.lastWatcher, participant.watcher.toString());
        })
      ),
    {dispatch: false}
  );

  // The server removed the participant while this tab is still open, for example after the connection was gone for too long
  removedByServer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.removeParticipantSuccess),
      withLatestFrom(
        this.store.select(RoomSelector.idSelector),
        this.store.select(ParticipantSelector.currentParticipantSelector)
      ),
      filter(([{participant}, , current]) =>
        !!current && participant.nickname.trim().toLowerCase() === current.nickname.trim().toLowerCase()),
      map(([, roomId, current]) => ParticipantAction.seatLost({roomId, participant: current}))
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
