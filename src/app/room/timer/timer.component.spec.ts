import {ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import {TimerComponent} from "./timer.component";
import {TimerSignal} from "./timer-signal";
import * as RoomAction from "../../store/room/room.action";
import {appState, room} from "../../testing/test-data";
import {TranslatePipe} from "../../i18n/translate.pipe";

describe("TimerComponent", () => {
  let fixture: ComponentFixture<TimerComponent>;
  let store: MockStore;
  let signal: jasmine.SpyObj<TimerSignal>;

  beforeEach(() => {
    signal = jasmine.createSpyObj("TimerSignal", ["ring"]);
    TestBed.configureTestingModule({
      declarations: [TimerComponent],
      imports: [TranslatePipe, NgbModule],
      providers: [
        provideMockStore({initialState: appState()}),
        {provide: TimerSignal, useValue: signal}
      ]
    });
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
    fixture = TestBed.createComponent(TimerComponent);
  });

  function runTimer(seconds: number, endsAt: number): void {
    store.setState(appState({room: room({timer: {seconds, endsAt}})}));
    fixture.detectChanges();
  }

  function shown(): string | undefined {
    return fixture.nativeElement.querySelector(".timer .time")?.textContent.trim();
  }

  function timerElement(): HTMLElement {
    return fixture.nativeElement.querySelector(".timer");
  }

  it("offers the lengths of the timer while none runs", () => {
    fixture.detectChanges();
    fixture.nativeElement.querySelector(".timer-toggle").click();
    fixture.detectChanges();

    const options = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll("[ngbDropdownItem]"));
    expect(options.map(option => option.textContent!.trim())).toEqual(["1 min", "2 min", "3 min", "5 min", "10 min"]);
    options[2].click();

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.startTimer({seconds: 180}));
  });

  it("offers no timer once the cards are revealed", () => {
    store.setState(appState({room: room(), showVotingResult: true}));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(".timer-toggle")).toBeNull();

    store.setState(appState({room: room(), showVotingResult: false}));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(".timer-toggle")).not.toBeNull();
  });

  it("counts down and signals once when the time runs out", fakeAsync(() => {
    runTimer(60, Date.now() + 12000);
    expect(shown()).toBe("0:12");
    expect(timerElement().classList).not.toContain("warning");

    tick(2000);
    fixture.detectChanges();
    expect(shown()).toBe("0:10");
    expect(timerElement().classList).toContain("warning");
    expect(signal.ring).not.toHaveBeenCalled();

    tick(10000);
    fixture.detectChanges();
    expect(shown()).toBe("Time's up");
    expect(timerElement().classList).toContain("time-up");
    expect(signal.ring).toHaveBeenCalledTimes(1);

    tick(5000);
    expect(signal.ring).toHaveBeenCalledTimes(1);
  }));

  it("shows a timer that ran out before the page opened without the signal", fakeAsync(() => {
    runTimer(60, Date.now() - 1000);

    expect(shown()).toBe("Time's up");
    tick(1000);
    expect(signal.ring).not.toHaveBeenCalled();
  }));

  it("stops the timer", fakeAsync(() => {
    runTimer(300, Date.now() + 125000);
    expect(shown()).toBe("2:05");

    fixture.nativeElement.querySelector(".timer .btn-close").click();

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.stopTimer());
    discardPeriodicTasks();
  }));

  it("goes back to the choice when the timer is stopped", fakeAsync(() => {
    runTimer(300, Date.now() + 60000);

    store.setState(appState());
    fixture.detectChanges();

    expect(timerElement()).toBeNull();
    expect(fixture.nativeElement.querySelector(".timer-toggle")).not.toBeNull();
    tick(1000);
  }));
});
