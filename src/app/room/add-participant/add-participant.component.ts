import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {RoomService} from "../../services/room.service";
import {AbstractControl, AsyncValidatorFn, FormControl, FormGroup, ValidationErrors} from "@angular/forms";
import {map, Observable, Subject, takeUntil} from "rxjs";
import {Store} from "@ngrx/store";
import * as RoomAction from "../../store/room/room.action";
import {Participant} from "../../models/participant.model";
import {AppConstants} from "../../common/app-constants";
import {RoomValidators, validationMessage} from "../../common/room-validators";
import * as RoomSelector from "../../store/room/room.selector";

@Component({
  selector: 'app-add-participant',
  templateUrl: './add-participant.component.html',
  styleUrls: ['./add-participant.component.css']
})
export class AddParticipantComponent implements OnInit, OnDestroy {

  joinToRoomForm: FormGroup;
  roomId: string;
  ngDestroyed$ = new Subject<void>();
  error$: Observable<string | undefined> = this.store.select(RoomSelector.errorSelector);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roomService: RoomService,
    private store: Store
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
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }

  nicknameError(): string | undefined {
    return validationMessage(this.joinToRoomForm.controls["nickname"].errors, "Nickname");
  }

  addParticipant(): void {
    if (this.joinToRoomForm.valid) {
      const participant: Participant = {
        nickname: this.joinToRoomForm.value.nickname.trim(),
        watcher: this.joinToRoomForm.value.watcher
      }
      this.store.dispatch(RoomAction.addParticipant({roomId: this.roomId, participant}));
    }
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
