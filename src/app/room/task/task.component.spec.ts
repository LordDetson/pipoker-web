import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {Subject} from "rxjs";
import {TASK_SAVE_DELAY_MS, TaskComponent} from "./task.component";
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

  const name = () => element<HTMLInputElement>(".task-name")!;
  const url = () => element<HTMLInputElement>(".task-url")!;
  const component = () => fixture.componentInstance;

  function setState(task: TaskDto | undefined, showVotingResult: boolean = false): void {
    store.setState(appState({room: room({task}), showVotingResult}));
    fixture.detectChanges();
  }

  function focus(input: HTMLInputElement): void {
    input.dispatchEvent(new Event("focus"));
    fixture.detectChanges();
  }

  function leave(input: HTMLInputElement): void {
    input.dispatchEvent(new Event("blur"));
    fixture.detectChanges();
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
  }

  function press(input: HTMLInputElement, key: string): void {
    input.dispatchEvent(new KeyboardEvent("keydown", {key}));
    fixture.detectChanges();
  }

  function openLink(): void {
    element<HTMLButtonElement>("button.task-link")!.click();
    fixture.detectChanges();
  }

  it("shows the name of the task, and its link behind the icon beside it", () => {
    expect(name().placeholder).toBe("Task name");
    expect(element(".task-url")).toBeNull();
    expect(element(".task-open")).withContext("nothing to open without a link").toBeNull();

    setState({name: "PIP-25", url: "https://example.com/PIP-25"});
    expect(name().value).toBe("PIP-25");
    const open = element<HTMLAnchorElement>("a.task-open")!;
    expect(open.href).toBe("https://example.com/PIP-25");
    expect(open.target).toBe("_blank");
    expect(open.rel).toBe("noopener noreferrer");
    openLink();
    expect(url().value).toBe("https://example.com/PIP-25");
    expect(document.activeElement).withContext("ready for a link to be pasted").toBe(url());
    expect(url().placeholder).toBe("Link to the task");
  });

  it("only opens the link once the cards are revealed", () => {
    setState({name: "PIP-25", url: "https://example.com/PIP-25"}, true);

    expect(name().disabled).toBeTrue();
    expect(element("button.task-link")).toBeNull();
    expect(element<HTMLAnchorElement>("a.task-open")!.href).toBe("https://example.com/PIP-25");
  });

  it("sends the task once the person stops typing", fakeAsync(() => {
    focus(name());
    type(name(), "PIP");
    tick(TASK_SAVE_DELAY_MS / 2);
    type(name(), " PIP-25 ");
    tick(TASK_SAVE_DELAY_MS - 1);
    expect(roomService.setTask).not.toHaveBeenCalled();

    tick(1);
    expect(roomService.setTask).toHaveBeenCalledOnceWith(ROOM_ID, {name: "PIP-25", url: ""});
  }));

  it("sends the link the same way, with the name the room has", fakeAsync(() => {
    setState({name: "PIP-25"});
    openLink();
    focus(url());
    type(url(), "https://example.com/PIP-25");
    press(url(), "Enter");
    expect(roomService.setTask).toHaveBeenCalledOnceWith(ROOM_ID, {name: "PIP-25", url: "https://example.com/PIP-25"});

    expect(element(".task-url")).withContext("the field closes").toBeNull();
    tick(TASK_SAVE_DELAY_MS);
    expect(roomService.setTask).withContext("sent once").toHaveBeenCalledTimes(1);
  }));

  it("keeps a link until it has a name", fakeAsync(() => {
    openLink();
    focus(url());
    type(url(), "https://example.com/PIP-25");
    leave(url());
    expect(roomService.setTask).not.toHaveBeenCalled();

    focus(name());
    type(name(), "PIP-25");
    leave(name());
    expect(roomService.setTask).toHaveBeenCalledOnceWith(ROOM_ID, {name: "PIP-25", url: "https://example.com/PIP-25"});
    tick(TASK_SAVE_DELAY_MS);
  }));

  it("refuses a link that isn't a web link", fakeAsync(() => {
    focus(name());
    type(name(), "PIP-25");
    leave(name());
    roomService.setTask.calls.reset();
    openLink();
    focus(url());
    type(url(), "javascript:alert(1)");
    leave(url());
    tick(TASK_SAVE_DELAY_MS);

    expect(element(".task-error")!.textContent!.trim())
      .withContext("the field stays open with the error").toBe("The link must start with http:// or https://");
    expect(roomService.setTask).not.toHaveBeenCalled();
  }));

  it("brings back the room's task with Escape", fakeAsync(() => {
    setState({name: "PIP-25"});
    focus(name());
    type(name(), "PIP-26");
    press(name(), "Escape");
    leave(name());
    tick(TASK_SAVE_DELAY_MS);

    expect(name().value).toBe("PIP-25");
    expect(roomService.setTask).not.toHaveBeenCalled();
  }));

  it("offers to clear a field only while it is being changed", () => {
    setState({name: "PIP-25", url: "https://example.com/PIP-25"});
    expect(element(".task-clear")).toBeNull();

    openLink();
    focus(url());
    const mousedown = new MouseEvent("mousedown", {cancelable: true});
    element(".task-clear")!.dispatchEvent(mousedown);
    expect(mousedown.defaultPrevented).withContext("the field keeps the cursor").toBeTrue();
    element<HTMLButtonElement>(".task-clear")!.click();
    fixture.detectChanges();

    expect(url().value).toBe("");
    expect(roomService.setTask).toHaveBeenCalledOnceWith(ROOM_ID, {name: "PIP-25", url: ""});
    expect(element(".task-clear")).toBeNull();

    focus(name());
    expect(element(".task-field .task-clear")).not.toBeNull();
  });

  it("takes someone else's change unless this person is changing that field", () => {
    setState({name: "PIP-25"});
    focus(name());
    setState({name: "PIP-26"});
    expect(name().value).withContext("not changed here yet").toBe("PIP-26");

    type(name(), "PIP-27");
    setState({name: "PIP-28", url: "https://example.com/PIP-28"});
    expect(name().value).toBe("PIP-27");
    expect(component().form.controls.url.value).toBe("https://example.com/PIP-28");
  });

  it("shows the server's refusal", () => {
    focus(name());
    type(name(), "PIP-25");
    press(name(), "Enter");

    reply$.error({destination: "/app/room/" + ROOM_ID + "/task", message: "revealed", code: ErrorCode.cardsRevealed});
    fixture.detectChanges();

    expect(element("[role=alert]")!.textContent!.trim())
      .toBe("The cards are already revealed. This can be done in the next round");
  });

  it("drops an unsent change when the cards are revealed", fakeAsync(() => {
    setState({name: "PIP-25"});
    focus(name());
    type(name(), "PIP-26");
    setState({name: "PIP-25"}, true);
    tick(TASK_SAVE_DELAY_MS);

    expect(name().value).toBe("PIP-25");
    expect(roomService.setTask).not.toHaveBeenCalled();
  }));
});
