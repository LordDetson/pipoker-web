import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, FormGroup} from "@angular/forms";
import {AppConstants} from "../common/app-constants";
import {RoomService} from "../services/room.service";
import {Store} from "@ngrx/store";
import * as RoomAction from "../store/room/room.action";
import {Card} from "../models/card.model";
import {Observable, Subject, takeUntil} from "rxjs";
import {parseDeck, RoomValidators, validationMessage} from "../common/room-validators";
import * as RoomSelector from "../store/room/room.selector";
import {I18nService} from "../i18n/i18n.service";
import {TranslationKey} from "../i18n/translations";

interface CreateRoomFormGroup {
  nickname: FormControl<string>;
  roomName: FormControl<string>;
  deck: FormControl<string>;
  watcher: FormControl<boolean>;
}

@Component({
  selector: 'app-create-room',
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class CreateRoomComponent implements OnInit, OnDestroy {

  createRoomForm: FormGroup<CreateRoomFormGroup>;
  ngDestroyed$ = new Subject<void>();
  error$: Observable<unknown> = this.store.select(RoomSelector.errorSelector);

  constructor(
    private roomService: RoomService,
    private store: Store,
    private i18n: I18nService
  ) {
  }

  ngOnInit(): void {
    const nickname: string = localStorage.getItem(AppConstants.lastNickname) ?? "";
    const roomName: string = localStorage.getItem(AppConstants.lastRoomName) ?? "";
    const deck: string = localStorage.getItem(AppConstants.lastDeck) ?? AppConstants.defaultDeck;
    const watcher: boolean = JSON.parse(localStorage.getItem(AppConstants.lastWatcher) as string) ?? false;
    this.createRoomForm = new FormGroup<CreateRoomFormGroup>({
      nickname: new FormControl<string>(nickname, {
        nonNullable: true,
        validators: RoomValidators.displayName
      }),
      roomName: new FormControl<string>(roomName, {
        nonNullable: true,
        validators: RoomValidators.displayName
      }),
      deck: new FormControl<string>(deck, {
        nonNullable: true,
        validators: RoomValidators.deck
      }),
      watcher: new FormControl<boolean>(watcher, {nonNullable: true})
    });
    this.createRoomForm.get("nickname")?.valueChanges.pipe(takeUntil(this.ngDestroyed$))
      .subscribe(value => localStorage.setItem(AppConstants.lastNickname, value));
    this.createRoomForm.get("roomName")?.valueChanges.pipe(takeUntil(this.ngDestroyed$))
      .subscribe(value => localStorage.setItem(AppConstants.lastRoomName, value));
    this.createRoomForm.get("deck")?.valueChanges.pipe(takeUntil(this.ngDestroyed$))
      .subscribe(value => localStorage.setItem(AppConstants.lastDeck, value));
    this.createRoomForm.get("watcher")?.valueChanges.pipe(takeUntil(this.ngDestroyed$))
      .subscribe(value => localStorage.setItem(AppConstants.lastWatcher, value.toString()));
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
  }

  errorMessage(field: keyof CreateRoomFormGroup, label: TranslationKey): string | undefined {
    return validationMessage(this.createRoomForm.controls[field].errors, label, this.i18n);
  }

  createRoom(): void {
    if (this.createRoomForm.valid) {
      const cards: Card[] = parseDeck(this.createRoomForm.value.deck!).map(value => ({value}));
      this.store.dispatch(RoomAction.create({
        createRoomInfo: {
          nickname: this.createRoomForm.value.nickname!.trim(),
          roomName: this.createRoomForm.value.roomName!.trim(),
          deck: {cards},
          watcher: this.createRoomForm.value.watcher!
        }
      }));
    }
  }
}
