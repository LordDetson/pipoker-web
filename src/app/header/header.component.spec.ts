import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {Clipboard} from "@angular/cdk/clipboard";
import {HeaderComponent} from "./header.component";
import {appState, room, roomState} from "../testing/test-data";
import {environment} from "../../env/env";

describe("HeaderComponent", () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;
  let clipboard: jasmine.SpyObj<Clipboard>;

  beforeEach(() => {
    clipboard = jasmine.createSpyObj<Clipboard>("Clipboard", ["copy"]);
    TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        provideMockStore({initialState: appState({room: room({id: "room-1", name: "Planning"})})}),
        {provide: Clipboard, useValue: clipboard}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  function copyButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector("button");
  }

  it("shows the room name and the invitation button inside a room", () => {
    expect(fixture.nativeElement.textContent).toContain("Planning");
    expect(copyButton()?.textContent).toContain("Copy Invitation Link");
  });

  it("shows neither outside a room", () => {
    store.setState({...appState(), roomState: roomState({room: room({id: "", name: ""})})});
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector("strong.text-center")).toBeNull();
    expect(copyButton()).toBeNull();
  });

  it("copies the invitation link and confirms it for a moment", fakeAsync(() => {
    copyButton()!.click();
    fixture.detectChanges();

    expect(clipboard.copy).toHaveBeenCalledWith(environment.invitationUrl + "room-1");
    expect(copyButton()!.classList).toContain("btn-success");

    tick(1500);
    fixture.detectChanges();

    expect(copyButton()!.classList).toContain("btn-primary");
  }));
});
