import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {CreateRoomComponent} from "./create-room.component";
import {RoomService} from "../services/room.service";
import {AppConstants} from "../common/app-constants";
import * as RoomAction from "../store/room/room.action";
import {appState, cards} from "../testing/test-data";

describe("CreateRoomComponent", () => {
  let fixture: ComponentFixture<CreateRoomComponent>;
  let store: MockStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      declarations: [CreateRoomComponent],
      imports: [ReactiveFormsModule],
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

  it("stops remembering values once destroyed", () => {
    create();
    const form = fixture.componentInstance.createRoomForm;
    fixture.destroy();

    form.controls.nickname.setValue("Later");

    expect(localStorage.getItem(AppConstants.lastNickname)).toBeNull();
  });
});
