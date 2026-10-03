import {TestBed} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {provideMockStore} from "@ngrx/store/testing";
import {TableComponent} from "./table.component";
import {appState, participant, room} from "../../testing/test-data";

describe("TableComponent", () => {

  it("shows a card for every participant", () => {
    TestBed.configureTestingModule({
      declarations: [TableComponent],
      providers: [provideMockStore({
        initialState: appState({room: room({participants: [participant("Dmitry"), participant("Alex", true)]})})
      })],
      schemas: [NO_ERRORS_SCHEMA]
    });
    const fixture = TestBed.createComponent(TableComponent);
    fixture.detectChanges();

    const cards = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll("app-table-card"));
    expect(cards.length).toBe(2);
  });
});
