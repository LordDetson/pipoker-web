import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {Router} from "@angular/router";
import {Location} from "@angular/common";
import {ReactiveFormsModule} from "@angular/forms";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import {Store, StoreModule} from "@ngrx/store";
import {EffectsModule} from "@ngrx/effects";
import {NgChartsModule} from "ng2-charts";
import {AppComponent} from "../app.component";
import {routes} from "../app-routing.module";
import {CreateRoomComponent} from "../create-room/create-room.component";
import {HeaderComponent} from "../header/header.component";
import {ThemeSwitcherComponent} from "../header/theme-switcher/theme-switcher.component";
import {RoomComponent} from "../room/room.component";
import {AddParticipantComponent} from "../room/add-participant/add-participant.component";
import {ButtonsComponent} from "../room/buttons/buttons.component";
import {TableComponent} from "../room/table/table.component";
import {DeckComponent} from "../room/deck/deck.component";
import {DeckCardComponent} from "../room/deck/deck-card/deck-card.component";
import {TableCardComponent} from "../room/table/table-card/table-card.component";
import {VotingResultChartComponent} from "../room/voting-result-chart/voting-result-chart.component";
import {metaReducers, reducers} from "../store/intex";
import {RoomEffect} from "../store/room/room.effect";
import {ParticipantEffect} from "../store/participant/participant.effect";
import * as ParticipantAction from "../store/participant/participant.action";
import {STOMP_CLIENT_FACTORY} from "../services/room-web-socket.service";
import {FakePipokerServer} from "../testing/fake-stomp";
import {participant} from "../testing/test-data";

// Runs the whole client (components, store, effects and services) against an in-memory imitation
// of the pipoker-app STOMP API. Only the STOMP connection itself is replaced.
describe("PiPoker room (integration)", () => {
  let server: FakePipokerServer;
  let fixture: ComponentFixture<AppComponent>;
  let page: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    server = new FakePipokerServer();
    await TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        CreateRoomComponent,
        HeaderComponent,
        ThemeSwitcherComponent,
        RoomComponent,
        AddParticipantComponent,
        ButtonsComponent,
        TableComponent,
        DeckComponent,
        DeckCardComponent,
        TableCardComponent,
        VotingResultChartComponent
      ],
      imports: [
        RouterTestingModule.withRoutes(routes),
        NgbModule,
        ReactiveFormsModule,
        StoreModule.forRoot(reducers, {
          metaReducers,
          runtimeChecks: {
            strictStateImmutability: true,
            strictActionImmutability: true
          }
        }),
        EffectsModule.forRoot([RoomEffect, ParticipantEffect]),
        NgChartsModule
      ],
      providers: [{provide: STOMP_CLIENT_FACTORY, useValue: server.createClient}]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    // Like in the browser, the page is re-rendered after every event, not only when a test asks for it.
    fixture.autoDetectChanges(true);
    page = fixture.nativeElement;
  });

  afterEach(() => localStorage.clear());

  // Lets the fake server answer and the application react, one network hop at a time.
  async function settle(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve));
      fixture.detectChanges();
    }
  }

  async function open(url: string): Promise<void> {
    await fixture.ngZone!.run(() => TestBed.inject(Router).navigateByUrl(url));
    await settle();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new Event("blur"));
    await settle();
  }

  async function click(element: HTMLElement): Promise<void> {
    element.click();
    await settle();
  }

  function button(text: string): HTMLButtonElement {
    return Array.from(page.querySelectorAll("button")).find(button => button.textContent!.trim() === text)!;
  }

  function path(): string {
    return TestBed.inject(Location).path();
  }

  function tableCards(): { nickname: string, voted: boolean, value?: string }[] {
    return Array.from(page.querySelectorAll("app-table-card .card")).map(card => ({
      nickname: card.querySelector(".card-title")!.textContent!.trim(),
      voted: card.classList.contains("voted"),
      value: card.querySelector(".card-body-back .card-text")?.textContent!.trim()
    }));
  }

  function deckCards(): HTMLElement[] {
    return Array.from(page.querySelectorAll<HTMLElement>("app-deck-card"));
  }

  function deckCard(value: string): HTMLElement {
    return deckCards().find(card => card.textContent!.trim() === value)!;
  }

  async function createRoom(nickname: string, roomName: string, deck: string, watcher = false): Promise<string> {
    await open("/");
    await type("#nicknameInput", nickname);
    await type("#roomNameInput", roomName);
    await type("#deckInput", deck);
    if (watcher) {
      await click(page.querySelector<HTMLElement>("#watcherInput")!);
    }
    await click(button("Create Room"));
    return path().replace("/room/", "");
  }

  it("creates a room and enters it", async () => {
    const roomId = await createRoom("Dmitry", "Sprint 42", "1h; 4h; 1d");

    expect(path()).toBe("/room/" + roomId);
    expect(server.rooms.get(roomId)).toEqual(jasmine.objectContaining({
      name: "Sprint 42",
      cards: ["1h", "4h", "1d"],
      participants: [participant("Dmitry")]
    }));
    expect(page.querySelector("app-header")!.textContent).toContain("Sprint 42");
    expect(button("Copy Invitation Link")).toBeDefined();
    expect(tableCards()).toEqual([{nickname: "Dmitry", voted: false, value: undefined}]);
    expect(deckCards().map(card => card.textContent!.trim())).toEqual(["1h", "4h", "1d"]);
    expect(button("Voting...").disabled).toBeTrue();
  });

  it("plays a whole voting round with another participant", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 4h; 1d");

    server.join(roomId, participant("Alex"));
    await settle();
    expect(tableCards().map(card => card.nickname)).toEqual(["Dmitry", "Alex"]);

    await click(deckCard("4h").querySelector(".card-body")!);
    expect(deckCard("4h").classList).toContain("selected");
    expect(server.rooms.get(roomId)!.votes).toEqual([{nickname: "Dmitry", card: "4h"}]);

    server.vote(roomId, "Alex", "1d");
    await settle();
    expect(tableCards()).toEqual([
      {nickname: "Dmitry", voted: true, value: undefined},
      {nickname: "Alex", voted: true, value: undefined}
    ]);

    await click(button("Reveal Cards"));
    expect(page.querySelector("app-voting-result-chart canvas")).not.toBeNull();
    expect(page.querySelector("app-deck")).toBeNull();
    expect(tableCards()).toEqual([
      {nickname: "Dmitry", voted: true, value: "4h"},
      {nickname: "Alex", voted: true, value: "1d"}
    ]);

    await click(button("Start New Voting"));
    expect(server.rooms.get(roomId)!.votes).toEqual([]);
    expect(page.querySelector("app-voting-result-chart")).toBeNull();
    expect(deckCards().some(card => card.classList.contains("selected"))).toBeFalse();
    expect(tableCards().every(card => !card.voted)).toBeTrue();
    expect(button("Voting...").disabled).toBeTrue();
  });

  it("sees the votes being revealed by another participant", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 1d");
    await click(deckCard("1d").querySelector(".card-body")!);

    server.showVotes(roomId);
    await settle();

    expect(tableCards()).toEqual([{nickname: "Dmitry", voted: true, value: "1d"}]);
    expect(button("Start New Voting")).toBeDefined();
  });

  it("removes a participant who left", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 1d");
    server.join(roomId, participant("Alex"));
    server.vote(roomId, "Alex", "1h");
    await settle();

    server.leave(roomId, "Alex");
    await settle();

    expect(tableCards().map(card => card.nickname)).toEqual(["Dmitry"]);
    expect(button("Voting...").disabled).withContext("the vote of the participant is gone too").toBeTrue();
  });

  it("joins a room by its invitation link", async () => {
    const roomId = server.addRoom("Planning", ["S", "M", "L"], [participant("Dmitry")], [{nickname: "Dmitry", card: "M"}]);

    await open("/room/" + roomId);
    expect(page.querySelector("app-header")!.textContent).toContain("Planning");
    expect(button("Join Room")).toBeDefined();

    await type("#nicknameInput", "dmitry");
    expect(page.querySelector("#nicknameInput")!.classList).withContext("the nickname is taken").toContain("is-invalid");
    expect(button("Join Room").disabled).toBeTrue();

    await type("#nicknameInput", "Alex");
    await click(button("Join Room"));

    expect(server.rooms.get(roomId)!.participants).toEqual([participant("Dmitry"), participant("Alex")]);
    expect(tableCards()).toEqual([
      {nickname: "Dmitry", voted: true, value: undefined},
      {nickname: "Alex", voted: false, value: undefined}
    ]);
    expect(deckCards().map(card => card.textContent!.trim())).toEqual(["S", "M", "L"]);
    expect(button("Reveal Cards")).toBeDefined();
  });

  it("does not show the deck to a watcher who joined by the invitation link", async () => {
    const roomId = server.addRoom("Planning", ["S", "M", "L"], [participant("Dmitry")]);
    await open("/room/" + roomId);

    await type("#nicknameInput", "Kate");
    await click(page.querySelector<HTMLElement>("#watcherInput")!);
    await click(button("Join Room"));

    expect(server.rooms.get(roomId)!.participants).toEqual([participant("Dmitry"), participant("Kate", true)]);
    expect(tableCards().map(card => card.nickname)).toEqual(["Dmitry", "Kate"]);
    expect(deckCards()).toEqual([]);
  });

  it("does not show the deck to a watcher", async () => {
    await createRoom("Dmitry", "Sprint", "1h; 1d", true);

    expect(tableCards().map(card => card.nickname)).toEqual(["Dmitry"]);
    expect(page.querySelector("app-table-card .eye-icon")).not.toBeNull();
    expect(deckCards()).toEqual([]);
  });

  it("leaves the room when the page is closed", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 1d");
    server.join(roomId, participant("Alex"));
    await settle();

    // What RoomComponent does on beforeunload.
    TestBed.inject(Store).dispatch(ParticipantAction.destroy());
    await settle();

    expect(server.rooms.get(roomId)!.participants).toEqual([participant("Alex")]);
    expect(button("Join Room")).withContext("asks for a nickname to come back").toBeDefined();
  });

  it("explains invalid input before anything is sent to the server", async () => {
    await open("/");
    await type("#nicknameInput", " a ");
    await type("#roomNameInput", "Sprint");
    await type("#deckInput", "1h; 2h; forever");

    expect(page.querySelector("#nicknameInput + .invalid-feedback")!.textContent).toBe("Nickname must be at least 2 characters long");
    expect(page.querySelector("#deckInput + .invalid-feedback")!.textContent).toBe("Card values can be at most 6 characters long: forever");
    expect(button("Create Room").disabled).toBeTrue();

    await type("#nicknameInput", " Dmitry ");
    await type("#deckInput", " 1h ;2h;; 1d ");
    await click(button("Create Room"));

    const roomId = path().replace("/room/", "");
    expect(server.rooms.get(roomId)).toEqual(jasmine.objectContaining({
      cards: ["1h", "2h", "1d"],
      participants: [participant("Dmitry")]
    }));
  });

  it("shows why the server refused to let a participant join", async () => {
    const roomId = server.addRoom("Planning", ["S", "M"], [participant("Dmitry")]);
    await open("/room/" + roomId);
    await type("#nicknameInput", "Alex");

    // Someone else takes the nickname after it was checked.
    server.join(roomId, participant("alex"));
    await settle();
    await click(button("Join Room"));

    expect(page.querySelector(".alert-danger")!.textContent).toBe("Alex is already in the room");
    expect(button("Join Room")).withContext("the form stays to try another nickname").toBeDefined();
    expect(page.querySelector("app-table")).toBeNull();
  });
});
