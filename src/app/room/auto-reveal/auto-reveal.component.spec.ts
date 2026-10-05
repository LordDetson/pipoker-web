import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {AutoRevealComponent} from "./auto-reveal.component";
import {appState, room} from "../../testing/test-data";
import {TranslatePipe} from "../../i18n/translate.pipe";
import {I18nService} from "../../i18n/i18n.service";
import * as RoomAction from "../../store/room/room.action";

describe("AutoRevealComponent", () => {
  let fixture: ComponentFixture<AutoRevealComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AutoRevealComponent],
      imports: [TranslatePipe],
      providers: [provideMockStore({initialState: appState()})]
    });
    TestBed.inject(I18nService).language = "en";
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
    fixture = TestBed.createComponent(AutoRevealComponent);
    fixture.detectChanges();
  });

  function toggle(): HTMLInputElement {
    return fixture.nativeElement.querySelector("#autoRevealSwitch");
  }

  function autoReveal(on: boolean): void {
    store.setState(appState({room: room({autoReveal: on})}));
    fixture.detectChanges();
  }

  it("shows whether the room reveals the cards by itself", () => {
    expect(fixture.nativeElement.textContent.trim()).toBe("When everyone has voted");
    expect(toggle().checked).toBeFalse();

    autoReveal(true);

    expect(toggle().checked).toBeTrue();
  });

  it("asks to turn it on and moves only when the room has it", () => {
    toggle().click();
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.setAutoReveal({autoReveal: true}));
    expect(toggle().checked).withContext("until everyone hears about the change").toBeFalse();
  });

  it("turns it off", () => {
    autoReveal(true);

    toggle().click();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.setAutoReveal({autoReveal: false}));
  });
});
