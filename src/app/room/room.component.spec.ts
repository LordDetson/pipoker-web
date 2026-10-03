import {ComponentFixture, TestBed} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {RoomComponent} from "./room.component";
import * as RoomAction from "../store/room/room.action";
import * as ParticipantAction from "../store/participant/participant.action";
import {RoomStatus} from "../store/room/room-state";
import {CurrentParticipantStatus} from "../store/participant/current-participant-state";
import {appState, ROOM_ID} from "../testing/test-data";

describe("RoomComponent", () => {
  let fixture: ComponentFixture<RoomComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RoomComponent],
      providers: [
        provideMockStore({initialState: appState()}),
        {provide: ActivatedRoute, useValue: {snapshot: {params: {id: ROOM_ID}}}}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
  });

  function create(): void {
    fixture = TestBed.createComponent(RoomComponent);
    fixture.detectChanges();
  }

  function renderedChildren(): string[] {
    return Array.from<Element>(fixture.nativeElement.children).map(child => child.tagName.toLowerCase());
  }

  it("loads the room from the link when it is not loaded yet", () => {
    store.setState(appState({status: RoomStatus.pending}, {status: CurrentParticipantStatus.pending}));
    create();

    expect(store.dispatch).toHaveBeenCalledWith(RoomAction.get({roomId: ROOM_ID}));
  });

  it("does not reload a room that was just created", () => {
    create();

    expect(store.dispatch).not.toHaveBeenCalledWith(RoomAction.get({roomId: ROOM_ID}));
  });

  it("asks for a nickname before joining", () => {
    store.setState(appState({}, {currentParticipant: undefined, status: CurrentParticipantStatus.pending}));
    create();

    expect(renderedChildren()).toEqual(["app-add-participant"]);
  });

  it("keeps asking for a nickname while joining and after the server refused it", () => {
    store.setState(appState({}, {currentParticipant: undefined, status: CurrentParticipantStatus.loading}));
    create();
    expect(renderedChildren()).toEqual(["app-add-participant"]);

    store.setState(appState({}, {currentParticipant: undefined, status: CurrentParticipantStatus.error}));
    fixture.detectChanges();
    expect(renderedChildren()).toEqual(["app-add-participant"]);
  });

  it("shows the table and the deck while voting", () => {
    create();

    expect(renderedChildren()).toEqual(["app-buttons", "app-table", "app-deck"]);
  });

  it("shows the chart instead of the deck once the votes are revealed", () => {
    store.setState(appState({showVotingResult: true}));
    create();

    expect(renderedChildren()).toEqual(["app-buttons", "app-table", "app-voting-result-chart"]);
  });

  it("leaves the room when the page is closed", () => {
    // A real beforeunload event would make Karma report a page reload, so the listener is called directly.
    const addEventListener = spyOn(window, "addEventListener");
    create();
    const [, listener] = addEventListener.calls.allArgs().find(([type]) => type === "beforeunload")!;

    (listener as () => void)();

    expect(store.dispatch).toHaveBeenCalledWith(ParticipantAction.destroy());
  });
});
