import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {Router} from "@angular/router";
import {Location} from "@angular/common";
import {ReactiveFormsModule} from "@angular/forms";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import {StoreModule} from "@ngrx/store";
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
import {RECONNECT_DELAYS, STOMP_CLIENT_FACTORY} from "../services/room-web-socket.service";
import {SeatStorage} from "../common/seat-storage";
import {AppConstants} from "../common/app-constants";
import {FakePipokerServer} from "../testing/fake-stomp";
import {participant} from "../testing/test-data";
import {TranslatePipe} from "../i18n/translate.pipe";
import {AboutComponent} from "../about/about.component";
import {HistoryComponent} from "../room/history/history.component";

// Runs the whole client (components, store, effects and services) against an in-memory imitation
// of the pipoker-app STOMP API. Only the STOMP connection itself is replaced.
describe("PiPoker room (integration)", () => {
  let server: FakePipokerServer;
  let fixture: ComponentFixture<AppComponent>;
  let page: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
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
        VotingResultChartComponent,
        HistoryComponent,
        AboutComponent
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
        NgChartsModule,
        TranslatePipe
      ],
      providers: [
        {provide: STOMP_CLIENT_FACTORY, useValue: server.createClient},
        {provide: RECONNECT_DELAYS, useValue: [0]}
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    // Like in the browser, the page is re-rendered after every event, not only when a test asks for it.
    fixture.autoDetectChanges(true);
    page = fixture.nativeElement;
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

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

  // The seats at the table, starting with the one of the person looking at the page
  function tableCards(): { nickname: string, voted: boolean, value?: string }[] {
    return Array.from(page.querySelectorAll("app-table-card")).map(seat => ({
      nickname: seat.querySelector(".nickname")!.textContent!.trim(),
      voted: seat.querySelector(".playing-card")!.classList.contains("voted"),
      value: seat.querySelector(".card-face .card-value")?.textContent!.trim()
    }));
  }

  function watchers(): string[] {
    return Array.from(page.querySelectorAll(".watchers .watcher")).map(watcher => watcher.textContent!.trim());
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
    expect(button("Invite")).toBeDefined();
    expect(tableCards()).toEqual([{nickname: "Dmitry", voted: false, value: undefined}]);
    expect(deckCards().map(card => card.textContent!.trim())).toEqual(["1h", "4h", "1d"]);
    expect(button("Voting...").disabled).toBeTrue();
  });

  it("speaks Russian once the language is switched", async () => {
    await open("/");
    await click(page.querySelector<HTMLElement>(".language-select [ngbDropdownToggle]")!);
    await click(page.querySelector<HTMLElement>(".language-select [ngbDropdownItem][lang=ru]")!);

    expect(page.querySelector("app-about h2")!.textContent).toBe("Что такое PiPoker?");
    await type("#nicknameInput", "D");
    expect(page.querySelector("#nicknameInput + .invalid-feedback")!.textContent)
      .toBe("Поле «Имя» должно содержать не меньше 2 символов");

    await type("#nicknameInput", "Dmitry");
    await type("#roomNameInput", "Sprint");
    await click(button("Создать комнату"));

    expect(button("Пригласить")).toBeDefined();
    expect(button("Голосование...").disabled).toBeTrue();
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
    expect(page.querySelector("app-deck")!.classList).withContext("the chart is shown in place of the deck").toContain("invisible");
    expect(tableCards()).toEqual([
      {nickname: "Dmitry", voted: true, value: "4h"},
      {nickname: "Alex", voted: true, value: "1d"}
    ]);

    await click(button("Start New Voting"));
    expect(server.rooms.get(roomId)!.votes).toEqual([]);
    expect(page.querySelector("app-voting-result-chart")).toBeNull();
    expect(page.querySelector("app-deck")!.classList).not.toContain("invisible");
    expect(deckCards().some(card => card.classList.contains("selected"))).toBeFalse();
    expect(tableCards().every(card => !card.voted)).toBeTrue();
    expect(button("Voting...").disabled).toBeTrue();
  });

  it("keeps every revealed round in the history everyone in the room sees", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 4h; 1d");
    server.join(roomId, participant("Alex"));
    await settle();
    const rounds = () => Array.from(page.querySelectorAll(".history-panel .round")).map(round => ({
      title: round.querySelector(".round-head .fw-medium")!.textContent!.trim(),
      tally: Array.from(round.querySelectorAll(".tally .badge")).map(badge => badge.textContent!.trim()),
      votes: Array.from(round.querySelectorAll(".votes li")).map(vote =>
        Array.from(vote.children).map(part => part.textContent!.trim()).join(" "))
    }));

    await click(deckCard("4h").querySelector(".card-body")!);
    server.vote(roomId, "Alex", "1d");
    await settle();
    await click(button("Reveal Cards"));
    await click(button("Start New Voting"));
    await click(deckCard("1d").querySelector(".card-body")!);
    server.showVotes(roomId);
    await settle();
    await click(page.querySelector<HTMLElement>(".history-toggle")!);

    expect(rounds()).toEqual([
      {title: "Round 2", tally: ["1d × 1"], votes: ["Dmitry 1d"]},
      {title: "Round 1", tally: ["4h × 1", "1d × 1"], votes: ["Dmitry 4h", "Alex 1d"]}
    ]);
  });

  it("shows the history of the room to someone who joins later", async () => {
    const roomId = server.addRoom("Planning", ["S", "M", "L"], [participant("Dmitry")], [{nickname: "Dmitry", card: "M"}]);
    server.showVotes(roomId);
    await settle();

    await open("/room/" + roomId);
    await type("#nicknameInput", "Alex");
    await click(button("Join Room"));
    await click(page.querySelector<HTMLElement>(".history-toggle")!);

    expect(page.querySelector(".history-panel .round-head")!.textContent).toContain("Round 1");
    expect(page.querySelector(".history-panel .tally .badge")!.textContent!.trim()).toBe("M × 1");
  });

  it("lays the deck out in more rows when the window gets narrower", async () => {
    await createRoom("Dmitry", "Sprint", "1h; 4h; 1d");
    const deckRows = () => Array.from(page.querySelectorAll(".deck-row")).map(row => row.querySelectorAll("app-deck-card").length);
    expect(deckRows()).toEqual([3]);

    page.style.width = "200px";
    window.dispatchEvent(new Event("resize"));
    await settle();

    expect(deckRows()).toEqual([2, 1]);
  });

  it("sees the votes being revealed by another participant", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 1d");
    await click(deckCard("1d").querySelector(".card-body")!);

    server.showVotes(roomId);
    await settle();

    expect(tableCards()).toEqual([{nickname: "Dmitry", voted: true, value: "1d"}]);
    expect(button("Start New Voting")).toBeDefined();
  });

  it("sees the revealed cards when joining after the reveal", async () => {
    const roomId = server.addRoom("Planning", ["S", "M", "L"], [participant("Dmitry")], [{nickname: "Dmitry", card: "M"}]);
    server.showVotes(roomId);
    await settle();

    await open("/room/" + roomId);
    await type("#nicknameInput", "Alex");
    await click(button("Join Room"));

    expect(tableCards()).toEqual([
      {nickname: "Alex", voted: false, value: undefined},
      {nickname: "Dmitry", voted: true, value: "M"}
    ]);
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
      {nickname: "Alex", voted: false, value: undefined},
      {nickname: "Dmitry", voted: true, value: undefined}
    ]);
    expect(deckCards().map(card => card.textContent!.trim())).toEqual(["S", "M", "L"]);
    expect(button("Reveal Cards")).toBeDefined();
  });

  it("says that an invitation to a room that no longer exists is not valid", async () => {
    await open("/room/gone");

    expect(page.querySelector("h2")!.textContent).toBe("This invitation is no longer valid");
    expect(button("Join Room")).toBeUndefined();
    expect(page.querySelector<HTMLAnchorElement>("a.btn-primary")!.getAttribute("href")).toBe("/");
  });

  it("says that the room no longer exists when the page is reloaded after the room is gone", async () => {
    SeatStorage.save("gone", participant("Alex"));

    await open("/room/gone");

    expect(page.querySelector("h2")!.textContent).toBe("This invitation is no longer valid");
    expect(SeatStorage.find("gone")).toBeUndefined();
  });

  it("says that the invitation is no longer valid when the room is removed while the join form is open", async () => {
    // The last person closed the page, and the room waits a moment for them to come back
    const roomId = server.addRoom("Sprint 42", ["S", "M"]);
    await open("/room/" + roomId);
    expect(button("Join Room")).toBeDefined();

    server.removeEmptyRoom(roomId);
    await settle();

    expect(page.querySelector("h2")!.textContent).toBe("This invitation is no longer valid");
    expect(button("Join Room")).toBeUndefined();
    expect(page.querySelector("app-header")!.textContent).not.toContain("Sprint 42");
  });

  it("leaves a room the server closed for inactivity", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 1d");

    server.closeIdleRoom(roomId);
    await settle();

    expect(page.querySelector("h2")!.textContent).toBe("The room is closed");
    expect(tableCards()).toEqual([]);
    expect(page.querySelector("app-header")!.textContent).not.toContain("Sprint");
    expect(button("Invite")).toBeUndefined();
    expect(SeatStorage.find(roomId)).toBeUndefined();
    expect(server.clients.every(client => client.disconnected)).withContext("the connection is closed").toBeTrue();
  });

  it("finishes checking the nickname when the connection is lost during the check", async () => {
    const roomId = server.addRoom("Planning", ["S", "M", "L"], [participant("Dmitry")]);
    await open("/room/" + roomId);

    const input = page.querySelector<HTMLInputElement>("#nicknameInput")!;
    input.value = "Alex";
    input.dispatchEvent(new Event("input"));
    // The answer to the check is lost with the connection
    server.loseConnections();
    input.dispatchEvent(new Event("blur"));
    await settle();

    expect(input.classList).toContain("is-valid");
    await click(button("Join Room"));
    expect(server.rooms.get(roomId)!.participants).toEqual([participant("Dmitry"), participant("Alex")]);
  });

  it("does not show the deck to a watcher who joined by the invitation link", async () => {
    const roomId = server.addRoom("Planning", ["S", "M", "L"], [participant("Dmitry")]);
    await open("/room/" + roomId);

    await type("#nicknameInput", "Kate");
    await click(page.querySelector<HTMLElement>("#watcherInput")!);
    await click(button("Join Room"));

    expect(server.rooms.get(roomId)!.participants).toEqual([participant("Dmitry"), participant("Kate", true)]);
    expect(tableCards().map(card => card.nickname)).toEqual(["Dmitry"]);
    expect(watchers()).toEqual(["Kate"]);
    expect(deckCards()).toEqual([]);
  });

  it("does not show the deck to a watcher", async () => {
    await createRoom("Dmitry", "Sprint", "1h; 1d", true);

    expect(tableCards()).withContext("a watcher has no seat at the table").toEqual([]);
    expect(watchers()).toEqual(["Dmitry"]);
    expect(page.querySelector(".watchers .eye-icon")).not.toBeNull();
    expect(deckCards()).toEqual([]);
  });

  it("takes the seat back after the page is reloaded", async () => {
    const roomId = server.addRoom("Planning", ["S", "M"], [participant("Dmitry"), participant("Alex")], [{nickname: "Alex", card: "M"}]);
    // What this tab remembered before the reload
    SeatStorage.save(roomId, participant("Alex"));

    await open("/room/" + roomId);

    expect(button("Join Room")).withContext("no need to join again").toBeUndefined();
    expect(tableCards()).toEqual([
      {nickname: "Alex", voted: true, value: undefined},
      {nickname: "Dmitry", voted: false, value: undefined}
    ]);
    expect(deckCard("M").classList).withContext("the vote made before the reload").toContain("selected");
    expect(server.rooms.get(roomId)!.participants).toEqual([participant("Dmitry"), participant("Alex")]);
  });

  it("stays at the table after a short connection loss and sees what happened meanwhile", async () => {
    const roomId = await createRoom("Dmitry", "Sprint", "1h; 1d");
    await click(deckCard("1d").querySelector(".card-body")!);

    server.loseConnections();
    server.join(roomId, participant("Alex"));
    server.vote(roomId, "Alex", "1h");
    server.showVotes(roomId);
    await settle();

    expect(button("Join Room")).toBeUndefined();
    expect(tableCards()).toEqual([
      {nickname: "Dmitry", voted: true, value: "1d"},
      {nickname: "Alex", voted: true, value: "1h"}
    ]);
    expect(button("Start New Voting")).toBeDefined();
  });

  it("offers to join again with the same nickname after a long connection loss", async () => {
    const roomId = await createRoom("Kate", "Sprint", "1h; 1d", true);
    server.join(roomId, participant("Dmitry"));
    await settle();
    // The nickname typed in another tab later does not matter
    localStorage.setItem(AppConstants.lastNickname, "Someone");

    server.loseConnections();
    // The server let the seat go before the connection came back
    server.leave(roomId, "Kate");
    await settle();

    expect(tableCards()).toEqual([]);
    expect(page.querySelector<HTMLInputElement>("#nicknameInput")!.value).toBe("Kate");
    expect(page.querySelector<HTMLInputElement>("#watcherInput")!.checked).toBeTrue();
    expect(button("Join Room").disabled).toBeFalse();

    await click(button("Join Room"));

    expect(server.rooms.get(roomId)!.participants).toEqual([participant("Dmitry"), participant("Kate", true)]);
    expect(tableCards().map(card => card.nickname)).toEqual(["Dmitry"]);
    expect(watchers()).toEqual(["Kate"]);
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
