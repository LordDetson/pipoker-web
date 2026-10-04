import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {DeckCardComponent} from "./deck-card.component";
import * as RoomAction from "../../../store/room/room.action";
import {appState, participant} from "../../../testing/test-data";

describe("DeckCardComponent", () => {
  let fixture: ComponentFixture<DeckCardComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DeckCardComponent],
      providers: [provideMockStore({initialState: appState({}, {currentParticipant: participant("Alex")})})]
    });
    store = TestBed.inject(MockStore);
    spyOn(store, "dispatch");
    fixture = TestBed.createComponent(DeckCardComponent);
    fixture.componentInstance.card = {value: "1d"};
    fixture.detectChanges();
  });

  function host(): HTMLElement {
    return fixture.nativeElement;
  }

  it("shows the card value", () => {
    expect(host().textContent!.trim()).toBe("1d");
    expect(host().classList).toContain("bg-body-secondary");
    expect(host().classList).not.toContain("selected");
  });

  it("votes with the card on click", () => {
    (host().querySelector(".card-body") as HTMLElement).click();

    expect(store.dispatch).toHaveBeenCalledOnceWith(RoomAction.selectCard({participant: participant("Alex"), card: {value: "1d"}}));
  });

  it("highlights the card the participant voted with", () => {
    store.setState(appState({}, {currentParticipant: participant("Alex"), selectedCard: {value: "1d"}}));
    fixture.detectChanges();

    expect(host().classList).toContain("selected");
    expect(host().classList).not.toContain("bg-body-secondary");

    store.setState(appState({}, {currentParticipant: participant("Alex"), selectedCard: {value: "1h"}}));
    fixture.detectChanges();

    expect(host().classList).not.toContain("selected");
  });

  it("gives longer values a smaller font", () => {
    expect(host().style.getPropertyValue("--value-length")).toBe("2");
  });

  it("stops following the vote once it is gone from the page", () => {
    fixture.destroy();
    store.setState(appState({}, {currentParticipant: participant("Alex"), selectedCard: {value: "1d"}}));

    expect(fixture.componentInstance.selected).toBeFalse();
  });
});
