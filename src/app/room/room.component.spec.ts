import {ComponentFixture, TestBed, fakeAsync, tick} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {RoomComponent} from "./room.component";
import * as RoomAction from "../store/room/room.action";
import * as ParticipantAction from "../store/participant/participant.action";
import {RoomStatus} from "../store/room/room-state";
import {CurrentParticipantStatus} from "../store/participant/current-participant-state";
import {appState, cards, participant, room, ROOM_ID, votes} from "../testing/test-data";
import {SeatStorage} from "../common/seat-storage";
import {TranslatePipe} from "../i18n/translate.pipe";

describe("RoomComponent", () => {
  let fixture: ComponentFixture<RoomComponent>;
  let store: MockStore;

  afterEach(() => sessionStorage.clear());

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      declarations: [RoomComponent],
      imports: [TranslatePipe],
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

  it("shows the table with the timer and the status button in the middle and the deck under it while voting", () => {
    create();

    expect(renderedChildren()).toEqual(["app-role-switch", "app-history", "app-task", "app-table", "div"]);
    expect(fixture.nativeElement.querySelector("app-table > .table-controls > app-timer + app-estimate + app-buttons")).not.toBeNull();
    expect(fixture.nativeElement.querySelector(".hand > app-deck").classList).not.toContain("invisible");
    expect(fixture.nativeElement.querySelector("app-voting-result")).toBeNull();
  });

  it("keeps the status button in place whether the timer is shown or not", () => {
    create();
    const controls: HTMLElement = fixture.nativeElement.querySelector(".table-controls");
    const timer: HTMLElement = controls.querySelector("app-timer")!;
    const buttons: HTMLElement = controls.querySelector("app-buttons")!;
    buttons.style.display = "block";
    buttons.style.height = "40px";
    timer.style.height = "48px";

    expect(controls.offsetHeight).withContext("the timer takes no room next to the button").toBe(40);
    expect(timer.getBoundingClientRect().bottom).withContext("the timer is above the button")
      .toBeLessThanOrEqual(buttons.getBoundingClientRect().top);
  });

  it("opens the menu of the timer over the status button", () => {
    create();
    const controls: HTMLElement = fixture.nativeElement.querySelector(".table-controls");
    const timer: HTMLElement = controls.querySelector("app-timer")!;
    const buttons: HTMLElement = controls.querySelector("app-buttons")!;
    buttons.style.display = "block";
    buttons.style.height = "40px";
    // The status button is dimmed while voting, which puts it in a layer of its own
    buttons.style.opacity = "0.65";
    const menu = document.createElement("div");
    menu.style.cssText = "position: absolute; top: 100%; width: 100px; height: 200px";
    timer.appendChild(menu);
    const middle = buttons.getBoundingClientRect();

    expect(document.elementFromPoint(middle.left + middle.width / 2, middle.top + middle.height / 2)).toBe(menu);
  });

  it("shows the result in place of the deck at once when the cards were revealed before the person came", () => {
    store.setState(appState({showVotingResult: true}));
    create();

    expect(fixture.nativeElement.querySelector(".hand > app-voting-result")).not.toBeNull();
    expect(fixture.nativeElement.querySelector(".hand > app-deck").classList)
      .withContext("the deck keeps its place, so the table does not change its size").toContain("invisible");
  });

  describe("while the revealed cards turn over", () => {
    // Alex's 1d turns 0.3 s after Dmitry's 1h, and a card takes 0.8 s to turn: the last one has turned after 1.1 s
    const voted = room({deck: {cards: cards("1h", "2h", "1d")}, votingResult: {map: votes({Dmitry: "1h", Alex: "1d"})}});

    beforeEach(() => document.documentElement.style.setProperty("--common-transition-duration", "0.8s"));

    afterEach(() => document.documentElement.style.removeProperty("--common-transition-duration"));

    // DeckComponent isn't declared here, so its input is left on the element
    function deck(): HTMLElement & { gathering?: boolean } {
      return fixture.nativeElement.querySelector(".hand > app-deck");
    }

    it("gathers the deck and shows the result once the last card has turned", fakeAsync(() => {
      store.setState(appState({room: voted}));
      create();

      store.setState(appState({room: voted, showVotingResult: true}));
      fixture.detectChanges();

      expect(deck().gathering).toBeTrue();
      expect(deck().classList).not.toContain("invisible");
      expect(fixture.nativeElement.querySelector("app-voting-result")).toBeNull();

      tick(1099);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("app-voting-result")).withContext("Alex's card is still turning").toBeNull();

      tick(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".hand > app-voting-result")).not.toBeNull();
      expect(deck().classList).toContain("invisible");
    }));

    it("deals the deck back out when a new round starts before the cards have turned", fakeAsync(() => {
      store.setState(appState({room: voted}));
      create();
      store.setState(appState({room: voted, showVotingResult: true}));
      fixture.detectChanges();

      store.setState(appState({room: voted}));
      fixture.detectChanges();
      tick(2000);
      fixture.detectChanges();

      expect(deck().gathering).toBeFalse();
      expect(deck().classList).not.toContain("invisible");
      expect(fixture.nativeElement.querySelector("app-voting-result")).toBeNull();
    }));

    it("gives a watcher's table the space of the deck they don't have, until the result comes", fakeAsync(() => {
      store.setState(appState({room: voted}, {currentParticipant: participant("Dmitry", true)}));
      create();

      expect(fixture.nativeElement.querySelector(".hand")).toBeNull();

      store.setState(appState({room: voted, showVotingResult: true}, {currentParticipant: participant("Dmitry", true)}));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".hand")).withContext("the cards are turning").toBeNull();

      tick(1100);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".hand > app-voting-result")).not.toBeNull();
    }));
  });

  it("takes the seat back after the page is reloaded", () => {
    SeatStorage.save(ROOM_ID, participant("Alex", true));
    store.setState(appState({status: RoomStatus.pending}, {currentParticipant: undefined, status: CurrentParticipantStatus.pending}));
    create();

    expect(store.dispatch).toHaveBeenCalledWith(ParticipantAction.returnToSeat({roomId: ROOM_ID, participant: participant("Alex", true)}));
  });

  it("asks for a nickname when this tab has no seat in the room", () => {
    SeatStorage.save("another-room", participant("Alex"));
    store.setState(appState({status: RoomStatus.pending}, {currentParticipant: undefined, status: CurrentParticipantStatus.pending}));
    create();

    expect(store.dispatch).not.toHaveBeenCalledWith(jasmine.objectContaining({type: ParticipantAction.returnToSeat.type}));
  });

  it("does not return to a seat it already has", () => {
    SeatStorage.save(ROOM_ID, participant("Dmitry"));
    create();

    expect(store.dispatch).not.toHaveBeenCalledWith(jasmine.objectContaining({type: ParticipantAction.returnToSeat.type}));
  });

  it("shows only a spinner while returning to the table", () => {
    store.setState(appState({}, {currentParticipant: undefined, status: CurrentParticipantStatus.returning}));
    create();

    expect(renderedChildren()).toEqual(["div"]);
    expect(fixture.nativeElement.querySelector(".spinner-border")).not.toBeNull();
  });

  it("does not leave the room when the page is closed or reloaded", () => {
    // RoomWebSocketService tells the server when the page is closed, which beforeunload can't do reliably
    const addEventListener = spyOn(window, "addEventListener").and.callThrough();
    create();

    expect(addEventListener.calls.allArgs().map(([type]) => type)).not.toContain("beforeunload");
  });
});
