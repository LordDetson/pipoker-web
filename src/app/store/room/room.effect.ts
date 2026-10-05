import {Injectable} from "@angular/core";
import {Actions, createEffect, ofType} from "@ngrx/effects";
import {RoomService} from "../../services/room.service";
import * as RoomAction from "./room.action";
import * as ParticipantAction from "../participant/participant.action";
import {catchError, concat, EMPTY, filter, ignoreElements, map, mergeMap, of, switchMap, tap, withLatestFrom} from "rxjs";
import {Router} from "@angular/router";
import {Store} from "@ngrx/store";
import * as RoomSelector from "./room.selector";
import * as ParticipantSelector from "../participant/participant.selector";
import {RoomWebSocketService} from "../../services/room-web-socket.service";
import {CurrentParticipantStatus} from "../participant/current-participant-state";
import {SeatStorage} from "../../common/seat-storage";

@Injectable()
export class RoomEffect {

  createRoom$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.create),
      switchMap(action =>
        this.roomService.create(action.createRoomInfo).pipe(
          switchMap(room =>
            of(
              RoomAction.initSuccess({room}),
              ParticipantAction.initSuccess({
                participant: room.participants.find(participant =>
                  participant.nickname.toLowerCase() === action.createRoomInfo.nickname.trim().toLowerCase()
                ) ?? room.participants[0]
              })
            )
          ),
          catchError(error =>
            of(
              RoomAction.initFailure({error}),
              ParticipantAction.initFailure({error})
            )
          )
        )
      )
    )
  );

  dispatchParticipantInit = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.create, RoomAction.addParticipant),
      switchMap(() => of(ParticipantAction.init()))
    ),
  );

  navigateToRoom$ = createEffect(() =>
      this.actions$.pipe(
        ofType(RoomAction.initSuccess),
        tap(action => this.router.navigate(["room", action.room.id]))
      ),
    {dispatch: false}
  );

  connectWebSocket$ = createEffect(() =>
      this.actions$.pipe(
        ofType(RoomAction.initSuccess),
        tap(action => this.roomWebSocketService.connect(action.room.id))
      ),
    {dispatch: false}
  );

  getRoom$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.get),
      mergeMap(action =>
        this.roomService.get(action.roomId).pipe(
          map(room => RoomAction.initSuccess({room})),
          catchError(error => of(RoomAction.initFailure({error})))
        )
      )
    )
  );

  // Events sent while the connection was gone never arrived. The participant takes the seat back,
  // if the server still keeps it for them, and the room is loaded again.
  refreshAfterReconnect$ = createEffect(() =>
    this.roomWebSocketService.reconnected$.pipe(
      withLatestFrom(
        this.store.select(RoomSelector.idSelector),
        this.store.select(ParticipantSelector.currentParticipantFeatureSelector)
      ),
      filter(([, roomId]) => !!roomId),
      switchMap(([, roomId, {currentParticipant, status}]) => {
        const seat = SeatStorage.find(roomId);
        if (status === CurrentParticipantStatus.returning && seat) {
          // The answer to the first attempt was lost with the connection
          return of(ParticipantAction.returnToSeat({roomId, participant: seat}));
        }
        return concat(
          currentParticipant
            ? this.roomService.returnParticipant(roomId, currentParticipant).pipe(
              ignoreElements(),
              catchError(() => of(ParticipantAction.seatLost({roomId, participant: currentParticipant})))
            )
            : EMPTY,
          this.roomService.get(roomId).pipe(
            map(room => RoomAction.refreshSuccess({room})),
            catchError(error => of(RoomAction.initFailure({error})))
          )
        );
      })
    )
  );

  // The room is gone, so there is no seat to take back after a reload and nothing more to hear from the server
  leaveGoneRoom$ = createEffect(() =>
      this.actions$.pipe(
        ofType(RoomAction.closed, RoomAction.removed),
        tap(({roomId}) => {
          SeatStorage.remove(roomId);
          this.roomWebSocketService.disconnect();
        })
      ),
    {dispatch: false}
  );

  addParticipant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.addParticipant),
      switchMap(action =>
        this.roomService.addParticipant(action.roomId, action.participant).pipe(
          switchMap(participant => of(ParticipantAction.initSuccess({participant}))),
          catchError(error =>
            of(
              ParticipantAction.initFailure({error}),
              RoomAction.addParticipantFailure({error})
            )
          )
        )
      )
    )
  );

  removeParticipant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.removeParticipant),
      mergeMap(action =>
        this.roomService.removeParticipant(action.roomId, action.participant).pipe(
          map(participant => RoomAction.doNothing()),
          catchError(error => of(RoomAction.removeParticipantFailure({error})))
        )
      )
    )
  );

  changeRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.changeRole),
      withLatestFrom(
        this.store.select(RoomSelector.idSelector),
        this.store.select(ParticipantSelector.currentParticipantSelector)
      ),
      filter(([, , participant]) => !!participant),
      // The role comes with the event the whole room gets, see RoomWebSocketService
      mergeMap(([{watcher}, roomId, participant]) =>
        this.roomService.changeRole(roomId, {nickname: participant.nickname, watcher}).pipe(
          map(() => RoomAction.doNothing()),
          catchError(error => of(RoomAction.changeRoleFailure({error})))
        )
      )
    )
  );

  selectCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.selectCard),
      withLatestFrom(
        this.store.select(RoomSelector.idSelector),
        this.store.select(ParticipantSelector.currentParticipantSelector)
      ),
      switchMap(([action, roomId, participant]) =>
        this.roomService.vote(roomId, action.participant, action.card).pipe(
          switchMap(vote => of(ParticipantAction.initSelectedCurdSuccess({card: vote.card}))),
          catchError(error =>
            of(
              RoomAction.cardSelectionFailure({error}),
              ParticipantAction.initSelectedCurdFailure({error})
            )
          )
        )
      )
    )
  );

  showVotingResult$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.showVotingResult),
      withLatestFrom(this.store.select(RoomSelector.idSelector)),
      tap(([action, roomId]) => this.roomService.showVotingResult(roomId))
    ),
    {dispatch: false}
  )

  startTimer$ = createEffect(() =>
      this.actions$.pipe(
        ofType(RoomAction.startTimer),
        withLatestFrom(this.store.select(RoomSelector.idSelector)),
        tap(([{seconds}, roomId]) => this.roomService.startTimer(roomId, seconds))
      ),
    {dispatch: false}
  );

  stopTimer$ = createEffect(() =>
      this.actions$.pipe(
        ofType(RoomAction.stopTimer),
        withLatestFrom(this.store.select(RoomSelector.idSelector)),
        tap(([, roomId]) => this.roomService.stopTimer(roomId))
      ),
    {dispatch: false}
  );

  startNewVoting$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.startNewVoting),
      withLatestFrom(this.store.select(RoomSelector.idSelector)),
      switchMap(([action, roomId]) =>
        this.roomService.clearVotingResult(roomId).pipe(
          switchMap(() => of(ParticipantAction.doNothing  ())),
          catchError(error =>
            of(
              RoomAction.startNewVotingFailure({error}),
              ParticipantAction.destroySelectedCurdFailure({error})
            )
          )
        )
      )
    )
  );

  dispatchDestroySelectedCurdSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RoomAction.startNewVotingSuccess),
      switchMap(action => of(ParticipantAction.destroySelectedCurdSuccess()))
    ),
  )

  constructor(
    private actions$: Actions,
    private roomService: RoomService,
    private roomWebSocketService: RoomWebSocketService,
    private router: Router,
    private store: Store
  ) {
  }
}
