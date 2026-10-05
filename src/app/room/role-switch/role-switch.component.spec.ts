import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {RoleSwitchComponent} from "./role-switch.component";
import {appState, participant} from "../../testing/test-data";
import {TranslatePipe} from "../../i18n/translate.pipe";
import {I18nService} from "../../i18n/i18n.service";
import * as RoomAction from "../../store/room/room.action";

describe("RoleSwitchComponent", () => {
  let fixture: ComponentFixture<RoleSwitchComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RoleSwitchComponent],
      imports: [TranslatePipe],
      providers: [provideMockStore({initialState: appState()})]
    });
    TestBed.inject(I18nService).language = "en";
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
    fixture = TestBed.createComponent(RoleSwitchComponent);
    fixture.detectChanges();
  });

  function toggle(): HTMLInputElement {
    return fixture.nativeElement.querySelector("#watcherSwitch");
  }

  it("shows the role of the person looking at the page", () => {
    expect(fixture.nativeElement.textContent.trim()).toBe("Watcher");
    expect(toggle().checked).toBeFalse();

    store.setState(appState({}, {currentParticipant: participant("Dmitry", true)}));
    fixture.detectChanges();

    expect(toggle().checked).toBeTrue();
  });

  it("asks for the other role and moves only when the room has it", () => {
    toggle().click();
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.changeRole({watcher: true}));
    expect(toggle().checked).withContext("until everyone hears about the change").toBeFalse();
  });

  it("makes a watcher a voter", () => {
    store.setState(appState({}, {currentParticipant: participant("Dmitry", true)}));
    fixture.detectChanges();

    toggle().click();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.changeRole({watcher: false}));
  });
});
