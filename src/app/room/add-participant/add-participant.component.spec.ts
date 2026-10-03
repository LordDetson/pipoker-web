import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {of} from "rxjs";
import {AddParticipantComponent} from "./add-participant.component";
import {RoomService} from "../../services/room.service";
import {AppConstants} from "../../common/app-constants";
import * as RoomAction from "../../store/room/room.action";
import {appState, participant, ROOM_ID} from "../../testing/test-data";

describe("AddParticipantComponent", () => {
  let fixture: ComponentFixture<AddParticipantComponent>;
  let store: MockStore;
  let roomService: jasmine.SpyObj<RoomService>;
  const takenNicknames = ["dmitry"];

  beforeEach(() => {
    localStorage.clear();
    roomService = jasmine.createSpyObj<RoomService>("RoomService", ["checkIfNicknameExist"]);
    roomService.checkIfNicknameExist.and.callFake((id, nickname) => of(takenNicknames.includes(nickname.toLowerCase())));
    TestBed.configureTestingModule({
      declarations: [AddParticipantComponent],
      imports: [ReactiveFormsModule],
      providers: [
        provideMockStore({initialState: appState()}),
        {provide: RoomService, useValue: roomService},
        {provide: ActivatedRoute, useValue: {snapshot: {params: {id: ROOM_ID}}}}
      ]
    });
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
  });

  afterEach(() => localStorage.clear());

  function create(): void {
    fixture = TestBed.createComponent(AddParticipantComponent);
    fixture.detectChanges();
  }

  function nicknameInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector("#nicknameInput");
  }

  function type(value: string): void {
    nicknameInput().value = value;
    nicknameInput().dispatchEvent(new Event("input"));
    nicknameInput().dispatchEvent(new Event("blur"));
    fixture.detectChanges();
  }

  function joinButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector("button[type=submit]");
  }

  it("fills the form with the last used nickname and role", () => {
    localStorage.setItem(AppConstants.lastNickname, "Alex");
    localStorage.setItem(AppConstants.lastWatcher, "true");
    create();

    expect(nicknameInput().value).toBe("Alex");
    expect(fixture.nativeElement.querySelector("#watcherInput").checked).toBeTrue();
    expect(joinButton().disabled).toBeFalse();
  });

  it("rejects a nickname that is already taken in the room", () => {
    create();
    type(" Dmitry ");

    expect(roomService.checkIfNicknameExist).toHaveBeenCalledWith(ROOM_ID, "Dmitry");
    expect(nicknameInput().classList).toContain("is-invalid");
    expect(joinButton().disabled).toBeTrue();
  });

  it("joins the room with the chosen nickname and role", () => {
    create();
    type("Alex");
    fixture.nativeElement.querySelector("#watcherInput").click();
    fixture.detectChanges();

    joinButton().click();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.addParticipant({roomId: ROOM_ID, participant: participant("Alex", true)}));
    expect(localStorage.getItem(AppConstants.lastNickname)).toBe("Alex");
    expect(localStorage.getItem(AppConstants.lastWatcher)).toBe("true");
  });

  it("does not join with an invalid nickname", () => {
    create();
    type("A");

    fixture.componentInstance.addParticipant();

    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
