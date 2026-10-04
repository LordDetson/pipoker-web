import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {CreateRoomComponent} from "./create-room.component";
import {RoomService} from "../services/room.service";
import {AppConstants} from "../common/app-constants";
import * as RoomAction from "../store/room/room.action";
import {appState, cards} from "../testing/test-data";
import {RoomStatus} from "../store/room/room-state";
import {TranslatePipe} from "../i18n/translate.pipe";
import {ServerErrorPipe} from "../i18n/server-error.pipe";
import {AboutComponent} from "../about/about.component";
import {ErrorCode} from "../models/room-event";
import {MyDecks, PRESET_DECKS} from "../common/decks";

describe("CreateRoomComponent", () => {
  let fixture: ComponentFixture<CreateRoomComponent>;
  let store: MockStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      declarations: [CreateRoomComponent, AboutComponent],
      imports: [ReactiveFormsModule, TranslatePipe, ServerErrorPipe],
      providers: [
        provideMockStore({initialState: appState()}),
        {provide: RoomService, useValue: {}}
      ]
    });
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
  });

  afterEach(() => localStorage.clear());

  function create(): void {
    fixture = TestBed.createComponent(CreateRoomComponent);
    fixture.detectChanges();
  }

  function input(id: string): HTMLInputElement {
    return fixture.nativeElement.querySelector("#" + id);
  }

  function type(id: string, value: string): void {
    input(id).value = value;
    input(id).dispatchEvent(new Event("input"));
    fixture.detectChanges();
  }

  function feedback(id: string): string {
    return fixture.nativeElement.querySelector("#" + id + " + .invalid-feedback").textContent;
  }

  function select(): HTMLSelectElement {
    return fixture.nativeElement.querySelector("#deckSelect");
  }

  function pick(value: string): void {
    select().value = value;
    select().dispatchEvent(new Event("change"));
    fixture.detectChanges();
  }

  function button(id: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector("#" + id);
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector("button[type=submit]");
  }

  it("starts with the default deck and an empty form", () => {
    create();

    expect(input("nicknameInput").value).toBe("");
    expect(input("roomNameInput").value).toBe("");
    expect(input("deckInput").value).toBe(AppConstants.defaultDeck);
    expect(input("watcherInput").checked).toBeFalse();
    expect(submitButton().disabled).toBeTrue();
  });

  it("fills the form with the last used values", () => {
    localStorage.setItem(AppConstants.lastNickname, "Dmitry");
    localStorage.setItem(AppConstants.lastRoomName, "Sprint");
    localStorage.setItem(AppConstants.lastDeck, "1; 2; 3");
    localStorage.setItem(AppConstants.lastWatcher, "true");
    create();

    expect(input("nicknameInput").value).toBe("Dmitry");
    expect(input("roomNameInput").value).toBe("Sprint");
    expect(input("deckInput").value).toBe("1; 2; 3");
    expect(input("watcherInput").checked).toBeTrue();
    expect(submitButton().disabled).toBeFalse();
  });

  it("remembers what was entered", () => {
    create();
    type("nicknameInput", "Alex");
    type("roomNameInput", "Planning");
    type("deckInput", "S; M; L");
    input("watcherInput").click();

    expect(localStorage.getItem(AppConstants.lastNickname)).toBe("Alex");
    expect(localStorage.getItem(AppConstants.lastRoomName)).toBe("Planning");
    expect(localStorage.getItem(AppConstants.lastDeck)).toBe("S; M; L");
    expect(localStorage.getItem(AppConstants.lastWatcher)).toBe("true");
  });

  it("marks invalid fields and keeps the form from being submitted", () => {
    create();
    type("nicknameInput", "A");
    input("nicknameInput").dispatchEvent(new Event("blur"));
    type("roomNameInput", "Planning");
    fixture.detectChanges();

    expect(input("nicknameInput").classList).toContain("is-invalid");
    expect(submitButton().disabled).toBeTrue();

    fixture.componentInstance.createRoom();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("creates a room with the deck split into cards", () => {
    create();
    type("nicknameInput", "Dmitry");
    type("roomNameInput", "Sprint");
    type("deckInput", "1h; 1d; 1w");
    input("watcherInput").click();

    submitButton().click();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.create({
      createRoomInfo: {nickname: "Dmitry", roomName: "Sprint", deck: {cards: cards("1h", "1d", "1w")}, watcher: true}
    }));
  });

  it("explains what is wrong with a field", () => {
    create();
    type("nicknameInput", "  a ");
    type("deckInput", "1h; 1h; forever");
    input("nicknameInput").dispatchEvent(new Event("blur"));
    input("deckInput").dispatchEvent(new Event("blur"));
    fixture.detectChanges();

    expect(feedback("nicknameInput")).toBe("Nickname must be at least 2 characters long");
    expect(feedback("deckInput")).toBe("Card values can be at most 6 characters long: forever");
  });

  it("sends trimmed names and cards", () => {
    create();
    type("nicknameInput", " Dmitry ");
    type("roomNameInput", " Sprint ");
    type("deckInput", " 1h ;1d;; 1w ");

    submitButton().click();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.create({
      createRoomInfo: {nickname: "Dmitry", roomName: "Sprint", deck: {cards: cards("1h", "1d", "1w")}, watcher: false}
    }));
  });

  it("puts the cards of a picked preset deck in the deck field", () => {
    create();
    expect(select().value).toBe("preset:time");

    pick("preset:fibonacci");

    expect(input("deckInput").value).toBe(PRESET_DECKS[0].cards);
    expect(localStorage.getItem(AppConstants.lastDeck)).toBe(PRESET_DECKS[0].cards);
    expect(button("saveDeckButton")).toBeNull();
  });

  it("lists the deck as own cards once its cards are changed, and saves it under a name", () => {
    create();
    type("deckInput", "1; 2; 4; 8");

    expect(select().value).toBe("");
    type("deckNameInput", "Powers");
    button("saveDeckButton")!.click();
    fixture.detectChanges();

    expect(MyDecks.load()).toEqual([{name: "Powers", cards: "1; 2; 4; 8"}]);
    expect(select().value).toBe("mine:Powers");
    expect(button("saveDeckButton")).toBeNull();
  });

  it("offers saved decks and deletes the picked one", () => {
    MyDecks.save({name: "Team", cards: "S; M; L"});
    create();

    pick("mine:Team");
    expect(input("deckInput").value).toBe("S; M; L");

    button("deleteDeckButton")!.click();
    fixture.detectChanges();

    expect(MyDecks.load()).toEqual([]);
    expect(select().value).toBe("");
    expect(input("deckInput").value).toBe("S; M; L");
  });

  it("does not offer to save an invalid deck or one without a name", () => {
    create();
    type("deckInput", "1; 1");
    expect(button("saveDeckButton")).toBeNull();

    type("deckInput", "1; 2");
    expect(button("saveDeckButton")!.disabled).toBeTrue();
  });

  it("clears the deck field for own cards", () => {
    create();
    pick("");

    expect(input("deckInput").value).toBe("");
    expect(document.activeElement).toBe(input("deckInput"));
  });

  it("shows why the server refused to create the room", () => {
    create();
    expect(fixture.nativeElement.querySelector(".alert-danger")).toBeNull();

    store.setState(appState({status: RoomStatus.error, error: {destination: "/app/room/create",
        message: "value - size must be between 1 and 6", code: ErrorCode.invalidData}}));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(".alert-danger").textContent)
      .toBe("The server didn't accept the data. Check it and try again");
  });

  it("stops remembering values once destroyed", () => {
    create();
    const form = fixture.componentInstance.createRoomForm;
    fixture.destroy();

    form.controls.nickname.setValue("Later");

    expect(localStorage.getItem(AppConstants.lastNickname)).toBeNull();
  });
});
