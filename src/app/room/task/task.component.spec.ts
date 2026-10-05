import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {Subject} from "rxjs";
import {TaskComponent} from "./task.component";
import {appState, room, ROOM_ID} from "../../testing/test-data";
import {TranslatePipe} from "../../i18n/translate.pipe";
import {ServerErrorPipe} from "../../i18n/server-error.pipe";
import {I18nService} from "../../i18n/i18n.service";
import {RoomService} from "../../services/room.service";
import {TaskDto} from "../../models/room-dto.model";
import {ErrorCode} from "../../models/room-event";

describe("TaskComponent", () => {
  let fixture: ComponentFixture<TaskComponent>;
  let store: MockStore;
  let roomService: jasmine.SpyObj<RoomService>;
  let reply$: Subject<TaskDto | undefined>;

  beforeEach(() => {
    reply$ = new Subject<TaskDto | undefined>();
    roomService = jasmine.createSpyObj<RoomService>("RoomService", ["setTask"]);
    roomService.setTask.and.returnValue(reply$);
    TestBed.configureTestingModule({
      declarations: [TaskComponent],
      imports: [TranslatePipe, ServerErrorPipe, ReactiveFormsModule],
      providers: [
        provideMockStore({initialState: appState()}),
        {provide: RoomService, useValue: roomService}
      ]
    });
    TestBed.inject(I18nService).language = "en";
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(TaskComponent);
    fixture.detectChanges();
  });

  function element<T extends HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function setState(task: TaskDto | undefined, showVotingResult: boolean = false): void {
    store.setState(appState({room: room({task}), showVotingResult}));
    fixture.detectChanges();
  }

  function type(selector: string, value: string): void {
    const input = element<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
  }

  it("offers to name the task while the cards are hidden", () => {
    expect(element(".task-add")!.textContent!.trim()).toBe("What are we estimating?");

    setState(undefined, true);

    expect(element(".task-add")).toBeNull();
  });

  it("shows the task to everyone, as a link when it has one", () => {
    setState({name: "PIP-25 Task name", url: "https://example.com/PIP-25"});

    const link = element<HTMLAnchorElement>("a.task-name")!;
    expect(link.textContent).toBe("PIP-25 Task name");
    expect(link.href).toBe("https://example.com/PIP-25");
    expect(link.rel).toBe("noopener noreferrer");
    expect(element(".task-edit")).not.toBeNull();

    setState({name: "PIP-26"}, true);

    expect(element("span.task-name")!.textContent).toBe("PIP-26");
    expect(element(".task-edit")).toBeNull();
  });

  it("sends what was typed and closes the form when the room hears it", () => {
    setState({name: "PIP-24"});
    element<HTMLButtonElement>(".task-edit")!.click();
    fixture.detectChanges();
    expect(element<HTMLInputElement>(".task-form input")!.value).toBe("PIP-24");

    type("input[formControlName=name]", " PIP-25 ");
    type("input[formControlName=url]", "https://example.com/PIP-25");
    element<HTMLFormElement>(".task-form")!.dispatchEvent(new Event("submit"));
    fixture.detectChanges();

    expect(roomService.setTask).toHaveBeenCalledOnceWith(ROOM_ID, {name: " PIP-25 ", url: "https://example.com/PIP-25"});
    expect(element(".task-form")).not.toBeNull();
    reply$.next({name: "PIP-25"});
    fixture.detectChanges();
    expect(element(".task-form")).toBeNull();
  });

  it("refuses a link that isn't a web link", () => {
    element<HTMLButtonElement>(".task-add")!.click();
    fixture.detectChanges();

    type("input[formControlName=name]", "PIP-25");
    type("input[formControlName=url]", "javascript:alert(1)");

    expect(element(".task-error")!.textContent!.trim()).toBe("The link must start with http:// or https://");
    expect(element<HTMLButtonElement>(".task-form button[type=submit]")!.disabled).toBeTrue();
    element<HTMLFormElement>(".task-form")!.dispatchEvent(new Event("submit"));
    expect(roomService.setTask).not.toHaveBeenCalled();
  });

  it("removes the task", () => {
    setState({name: "PIP-25"});
    element<HTMLButtonElement>(".task-edit")!.click();
    fixture.detectChanges();

    element<HTMLButtonElement>(".btn-outline-danger")!.click();

    expect(roomService.setTask).toHaveBeenCalledOnceWith(ROOM_ID, {name: ""});
  });

  it("shows the server's refusal in the form", () => {
    element<HTMLButtonElement>(".task-add")!.click();
    fixture.detectChanges();
    type("input[formControlName=name]", "PIP-25");
    element<HTMLFormElement>(".task-form")!.dispatchEvent(new Event("submit"));

    reply$.error({destination: "/app/room/" + ROOM_ID + "/task", message: "revealed", code: ErrorCode.cardsRevealed});
    fixture.detectChanges();

    expect(element("[role=alert]")!.textContent!.trim()).toBe("The cards are already revealed. This can be done in the next round");
  });

  it("closes the form with Escape and when the cards are revealed", () => {
    element<HTMLButtonElement>(".task-add")!.click();
    fixture.detectChanges();
    element(".task-form")!.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
    fixture.detectChanges();
    expect(element(".task-form")).toBeNull();

    element<HTMLButtonElement>(".task-add")!.click();
    fixture.detectChanges();
    setState(undefined, true);
    expect(element(".task-form")).toBeNull();
  });
});
