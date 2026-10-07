import {Component, OnDestroy, OnInit, ChangeDetectionStrategy, Input} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {RoomService} from "../../services/room.service";
import {AbstractControl, AsyncValidatorFn, FormControl, FormGroup, ValidationErrors} from "@angular/forms";
import {filter, map, Observable, startWith, Subject, take, takeUntil} from "rxjs";
import {Store} from "@ngrx/store";
import * as RoomAction from "../../store/room/room.action";
import {Participant} from "../../models/participant.model";
import {AppConstants} from "../../common/app-constants";
import {RoomValidators, validationMessage} from "../../common/room-validators";
import * as RoomSelector from "../../store/room/room.selector";
import {I18nService} from "../../i18n/i18n.service";

@Component({
  selector: 'app-add-participant',
  templateUrl: './add-participant.component.html',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AddParticipantComponent implements OnInit, OnDestroy {

  // Joins with the remembered nickname at once, without waiting for the person to press Join
  @Input() joinRightAway = false;

  joinToRoomForm: FormGroup;
  roomId: string;
  ngDestroyed$ = new Subject<void>();
  error$: Observable<unknown> = this.store.select(RoomSelector.errorSelector);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roomService: RoomService,
    private store: Store,
    private i18n: I18nService
  ) {
    this.roomId = this.route.snapshot.params['id'];
  }

  ngOnInit(): void {
    const nickname: string = localStorage.getItem(AppConstants.lastNickname) ?? "";
    const watcher: boolean = JSON.parse(localStorage.getItem(AppConstants.lastWatcher) as string) ?? false;
    this.joinToRoomForm = new FormGroup({
      nickname: new FormControl<string>(nickname, {
        nonNullable: true,
        validators: RoomValidators.displayName,
        asyncValidators: nicknameValidatorFactory(this.roomService, this.roomId)
      }),
      watcher: new FormControl<boolean>(watcher, {nonNullable: true})
    });
    this.joinToRoomForm.get("nickname")?.valueChanges.pipe(takeUntil(this.ngDestroyed$))
      .subscribe(value => localStorage.setItem(AppConstants.lastNickname, value));
    this.joinToRoomForm.get("watcher")?.valueChanges.pipe(takeUntil(this.ngDestroyed$))
      .subscribe(value => localStorage.setItem(AppConstants.lastWatcher, value.toString()));
    // The server answers a nickname taken in the room with an error, so there is no need to wait for the check here.
    // An empty or taken nickname stays in the form with its error, for the person to fix.
    if (this.joinRightAway) {
      this.joinToRoomForm.markAllAsTouched();
      if (!this.joinToRoomForm.controls["nickname"].invalid) {
        this.dispatchJoin();
      }
    }
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }

  nicknameError(): string | undefined {
    return validationMessage(this.joinToRoomForm.controls["nickname"].errors, "validation.nickname", this.i18n);
  }

  // The nickname is checked with the server while the person types, so Join or Enter right after typing
  // arrives before the check is done. Join as soon as it is, instead of ignoring the click.
  addParticipant(): void {
    this.joinToRoomForm.statusChanges.pipe(
      startWith(this.joinToRoomForm.status),
      filter(status => status !== "PENDING"),
      take(1),
      takeUntil(this.ngDestroyed$)
    ).subscribe(() => this.join());
  }

  private join(): void {
    if (this.joinToRoomForm.valid) {
      this.dispatchJoin();
    }
  }

  private dispatchJoin(): void {
    const participant: Participant = {
      nickname: this.joinToRoomForm.value.nickname.trim(),
      watcher: this.joinToRoomForm.value.watcher
    }
    this.store.dispatch(RoomAction.addParticipant({roomId: this.roomId, participant}));
  }
}

const nicknameValidatorFactory = (
  roomService: RoomService,
  roomId: string
): AsyncValidatorFn => {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return roomService.checkIfNicknameExist(roomId, control.value.trim())
      .pipe(
        map((taken: boolean) => taken ? {taken: {nickname: control.value.trim()}} : null)
      );
  };
};
