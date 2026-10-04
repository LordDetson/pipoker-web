import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {TableComponent} from "./table.component";
import {TableCardComponent} from "./table-card/table-card.component";
import {appState, participant, room} from "../../testing/test-data";
import {Participant} from "../../models/participant.model";
import {TranslatePipe} from "../../i18n/translate.pipe";
import {seatLayout} from "./seat-layout";

describe("TableComponent", () => {
  let fixture: ComponentFixture<TableComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TableComponent, TableCardComponent],
      imports: [TranslatePipe],
      providers: [provideMockStore({initialState: appState()})]
    });
    store = TestBed.inject(MockStore);
  });

  // The table takes the space it is given, like in the room, and seats people once it is measured
  async function create(participants: Participant[], viewer: Participant): Promise<void> {
    store.setState(appState({room: room({participants})}, {currentParticipant: viewer}));
    fixture = TestBed.createComponent(TableComponent);
    fixture.nativeElement.style.width = "800px";
    fixture.nativeElement.style.height = "400px";
    fixture.detectChanges();
    await measured();
  }

  // The ResizeObserver reports the size of the table when the page is laid out
  async function measured(): Promise<void> {
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve)));
    fixture.detectChanges();
  }

  function felt(): HTMLElement {
    return fixture.nativeElement.querySelector(".felt");
  }

  function seats(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(".felt > app-table-card"));
  }

  function seated(): string[] {
    return seats().map(seat => seat.querySelector(".nickname")!.textContent!);
  }

  function watchers(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(".watchers .watcher"))
      .map(watcher => watcher.textContent!.trim());
  }

  it("seats everyone who votes in the order they joined, starting with the person looking at the page", async () => {
    await create([participant("Dmitry"), participant("Alex"), participant("Kate"), participant("Olga")], participant("Kate"));

    expect(seated()).toEqual(["Kate", "Olga", "Dmitry", "Alex"]);
  });

  it("puts the person looking at the page at the bottom, in front of their deck", async () => {
    await create([participant("Dmitry"), participant("Alex")], participant("Alex"));

    expect(parseFloat(seats()[0].style.left)).toBeCloseTo(50, 5);
    expect(parseFloat(seats()[0].style.top)).toBeGreaterThan(50);
    expect(parseFloat(seats()[1].style.top)).withContext("the other one sits across the table").toBeLessThan(50);
  });

  it("lists the watchers apart from the table, where they have no seat", async () => {
    await create([participant("Dmitry"), participant("Kate", true), participant("Alex"), participant("Olga", true)], participant("Kate", true));

    expect(seated()).toEqual(["Dmitry", "Alex"]);
    expect(watchers()).toEqual(["Kate", "Olga"]);
    expect(fixture.nativeElement.querySelector(".watchers .eye-icon").title).toBe("Watchers");
  });

  it("shows no list of watchers when there are none", async () => {
    await create([participant("Dmitry")], participant("Dmitry"));

    expect(fixture.nativeElement.querySelector(".watchers")).toBeNull();
  });

  it("seats people at the places the layout gives for the measured table", async () => {
    await create([participant("Dmitry"), participant("Alex"), participant("Kate")], participant("Dmitry"));
    felt().style.width = "200px";
    felt().style.height = "400px";
    await measured();

    const layout = seatLayout(3, felt().clientWidth, felt().clientHeight);
    // The browser keeps percentages in a style to four decimals
    seats().forEach((seat, index) => {
      expect(parseFloat(seat.style.left)).withContext("left of seat " + index).toBeCloseTo(layout.seats[index].x, 3);
      expect(parseFloat(seat.style.top)).withContext("top of seat " + index).toBeCloseTo(layout.seats[index].y, 3);
    });
  });

  it("makes the cards smaller when too many people sit at the table", async () => {
    await create(Array.from({length: 30}, (_, index) => participant("Player " + index)), participant("Player 0"));

    const layout = seatLayout(30, felt().clientWidth, felt().clientHeight);
    expect(layout.cardSize).toBeLessThan(0.2);
    seats().forEach(seat => {
      expect(parseFloat(seat.style.getPropertyValue("--card-size"))).toBeCloseTo(layout.cardSize, 5);
      expect(parseFloat(seat.style.getPropertyValue("--seat-width"))).toBeCloseTo(layout.seatWidth, 5);
    });
  });

  it("seats nobody at a table that is not shown", async () => {
    store.setState(appState({room: room({participants: [participant("Dmitry")]})}, {currentParticipant: participant("Dmitry")}));
    fixture = TestBed.createComponent(TableComponent);
    fixture.nativeElement.style.display = "none";
    fixture.detectChanges();
    await measured();

    expect(seats()).toEqual([]);
  });
});
