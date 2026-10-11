import {Component, OnDestroy, OnInit, ChangeDetectionStrategy, ElementRef, Inject, PLATFORM_ID, ViewChild} from '@angular/core';
import {isPlatformBrowser} from "@angular/common";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Router} from "@angular/router";
import {AppConstants} from "../common/app-constants";
import {RoomService} from "../services/room.service";
import {Store} from "@ngrx/store";
import * as RoomAction from "../store/room/room.action";
import {Card} from "../models/card.model";
import {CreateRoomInfo} from "../models/create-room.model";
import {Observable, Subject, takeUntil} from "rxjs";
import {parseDeck, RoomValidators, validationMessage} from "../common/room-validators";
import * as RoomSelector from "../store/room/room.selector";
import {I18nService} from "../i18n/i18n.service";
import {TranslationKey} from "../i18n/translations";
import {MyDecks, NamedDeck, PRESET_DECKS, sameCards} from "../common/decks";
import {invitationValidator, JOIN_RIGHT_AWAY, roomIdFromInvitation} from "../common/invitation-link";
import {VisitService} from "../services/visit.service";
import {HumanCheckRun, HumanCheckService} from "../human-check/human-check.service";
import {PageMetaService} from "../services/page-meta.service";

// What the human check runs for; the server asks for it before it creates a room
export const HUMAN_CHECK_ACTION = "room";

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
  readonly presetDecks = PRESET_DECKS;
  myDecks: NamedDeck[] = [];
  // The deck picked in the list: "preset:<id>", "mine:<name>", or "" while the cards match none of them
  selectedDeck: string = "";
  // The name a new deck will be saved under
  deckName: string = "";
  // The room waits for the human check to finish
  creating = false;
  // An invitation link pasted here opens its room. The installed app has no address bar to paste it into
  readonly invitationForm = new FormGroup({
    link: new FormControl<string>("", {
      nonNullable: true,
      validators: [Validators.required, invitationValidator]
    })
  });

  @ViewChild("humanCheck", {static: true})
  private humanCheckContainer!: ElementRef<HTMLElement>;
  private humanCheck?: HumanCheckRun;
  // The last token went with a create request: it passes once
  private humanCheckTokenSent = false;

  constructor(
    private roomService: RoomService,
    private store: Store,
    private i18n: I18nService,
    private router: Router,
    private visits: VisitService,
    private humanCheckService: HumanCheckService,
    private pageMeta: PageMetaService,
    @Inject(PLATFORM_ID) private platform: Object
  ) {
  }

  ngOnInit(): void {
    this.visits.report();
    this.i18n.language$.pipe(takeUntil(this.ngDestroyed$)).subscribe(() => this.pageMeta.set({
      title: this.i18n.translate("meta.title"),
      description: this.i18n.translate("meta.description"),
      page: "/"
    }));
    // The build prerenders the start page without a browser, and then nothing is remembered
    const browser = isPlatformBrowser(this.platform);
    const remembered = (key: string) => browser ? localStorage.getItem(key) : null;
    this.myDecks = browser ? MyDecks.load() : [];
    const nickname: string = remembered(AppConstants.lastNickname) ?? "";
    const roomName: string = remembered(AppConstants.lastRoomName) ?? "";
    const deck: string = remembered(AppConstants.lastDeck) ?? AppConstants.defaultDeck;
    const watcher: boolean = JSON.parse(remembered(AppConstants.lastWatcher) as string) ?? false;
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
      .subscribe(value => {
        localStorage.setItem(AppConstants.lastDeck, value);
        this.selectedDeck = this.findDeck(value);
      });
    this.selectedDeck = this.findDeck(deck);
    this.createRoomForm.get("watcher")?.valueChanges.pipe(takeUntil(this.ngDestroyed$))
      .subscribe(value => localStorage.setItem(AppConstants.lastWatcher, value.toString()));
  }

  ngOnDestroy(): void {
    this.ngDestroyed$.next();
    this.ngDestroyed$.complete();
    this.humanCheck?.remove();
  }

  errorMessage(field: keyof CreateRoomFormGroup, label: TranslationKey): string | undefined {
    return validationMessage(this.createRoomForm.controls[field].errors, label, this.i18n);
  }

  // Picking a deck in the list puts its cards in the deck field, where they can still be changed
  pickDeck(selected: string, deckInput: HTMLInputElement): void {
    if (selected.startsWith("preset:")) {
      const preset = this.presetDecks.find(deck => "preset:" + deck.id === selected);
      this.createRoomForm.controls.deck.setValue(preset!.cards);
    } else if (selected.startsWith("mine:")) {
      const mine = this.myDecks.find(deck => "mine:" + deck.name === selected);
      this.createRoomForm.controls.deck.setValue(mine!.cards);
    } else {
      this.createRoomForm.controls.deck.setValue("");
      deckInput.focus();
    }
  }

  // Cards that are not one of the listed decks yet can be saved under a name
  get canSaveDeck(): boolean {
    return this.selectedDeck === "" && this.createRoomForm.controls.deck.valid;
  }

  saveDeck(): void {
    const name = this.deckName.trim();
    if (this.canSaveDeck && name !== "") {
      this.myDecks = MyDecks.save({name, cards: this.createRoomForm.controls.deck.value});
      this.selectedDeck = this.findDeck(this.createRoomForm.controls.deck.value);
      this.deckName = "";
    }
  }

  deleteDeck(): void {
    this.myDecks = MyDecks.remove(this.selectedDeck.slice("mine:".length));
    this.selectedDeck = this.findDeck(this.createRoomForm.controls.deck.value);
  }

  private findDeck(cards: string): string {
    const preset = this.presetDecks.find(deck => sameCards(deck.cards, cards));
    if (preset) {
      return "preset:" + preset.id;
    }
    const mine = this.myDecks.find(deck => sameCards(deck.cards, cards));
    return mine ? "mine:" + mine.name : "";
  }

  // The human check starts when the person first touches the form, while they fill it in. Visitors who only look,
  // and the build that prerenders the page, don't load Cloudflare's script
  startHumanCheck(): void {
    if (!this.humanCheck && isPlatformBrowser(this.platform)) {
      this.humanCheck = this.humanCheckService.start(this.humanCheckContainer.nativeElement, HUMAN_CHECK_ACTION);
    }
  }

  async createRoom(): Promise<void> {
    if (this.createRoomForm.invalid || this.creating) {
      return;
    }
    const cards: Card[] = parseDeck(this.createRoomForm.value.deck!).map(value => ({value}));
    const createRoomInfo: CreateRoomInfo = {
      nickname: this.createRoomForm.value.nickname!.trim(),
      roomName: this.createRoomForm.value.roomName!.trim(),
      deck: {cards},
      watcher: this.createRoomForm.value.watcher!
    };
    // A form remembered from the last visit may be sent without touching it
    this.startHumanCheck();
    // Another try, after a refusal, needs a new token. Asking for it only now, not right after sending, keeps
    // Turnstile from reloading its frame while the page leaves for the room
    if (this.humanCheckTokenSent) {
      this.humanCheck?.reset();
    }
    this.creating = true;
    const humanCheckToken = await this.humanCheck?.token();
    this.creating = false;
    if (humanCheckToken) {
      createRoomInfo.humanCheckToken = humanCheckToken;
    }
    this.store.dispatch(RoomAction.create({createRoomInfo}));
    this.humanCheckTokenSent = humanCheckToken !== undefined;
  }

  joinByInvitation(): void {
    const roomId = roomIdFromInvitation(this.invitationForm.controls.link.value);
    if (this.invitationForm.valid && roomId) {
      this.router.navigate(["room", roomId], {state: {[JOIN_RIGHT_AWAY]: true}});
    }
  }
}
