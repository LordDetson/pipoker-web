import {ComponentFixture, TestBed} from "@angular/core/testing";
import {firstValueFrom} from "rxjs";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {HistoryComponent} from "./history.component";
import {appState, cards, room} from "../../testing/test-data";
import {TranslatePipe} from "../../i18n/translate.pipe";
import {I18nService} from "../../i18n/i18n.service";
import {NgbDropdownModule} from "@ng-bootstrap/ng-bootstrap";

describe("HistoryComponent", () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let store: MockStore;

  const history = [
    {revealedAt: "2026-10-04T17:00:00.000Z", votes: [{nickname: "Alex", card: "1h"}, {nickname: "Dmitry", card: "1d"}]},
    {revealedAt: "2026-10-04T17:05:00.000Z", votes: [{nickname: "Alex", card: "1d"}, {nickname: "Dmitry", card: "1d"}]}
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HistoryComponent],
      imports: [TranslatePipe, NgbDropdownModule],
      providers: [provideMockStore({initialState: appState({room: room({name: "Sprint 12", deck: {cards: cards("1h", "1d")}, history})})})]
    });
    TestBed.inject(I18nService).language = "en";
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
  });

  function element(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function texts(selector: string): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector))
      .map(item => item.textContent!.replace(/\s+/g, " ").trim());
  }

  function openPanel(): void {
    element(".history-toggle")!.click();
    fixture.detectChanges();
  }

  it("shows a closed button with the number of rounds", () => {
    expect(texts(".history-toggle")).toEqual(["History 2"]);
    expect(element(".history-panel")!.classList).not.toContain("open");
    expect(element(".history-toggle")!.getAttribute("aria-expanded")).toBe("false");
  });

  it("lists the rounds with the latest first", () => {
    openPanel();

    expect(element(".history-toggle")!.getAttribute("aria-expanded")).toBe("true");
    expect(texts(".round-head .fw-medium")).toEqual(["Round 2", "Round 1"]);
    expect(texts(".round:first-child .tally .badge")).toEqual(["1d × 2"]);
    expect(texts(".round:first-child .result")).toEqual(["Result: 1d"]);
    expect(texts(".round:last-child .tally .badge")).toEqual(["1h × 1", "1d × 1"]);
    expect(texts(".round:last-child .result")).toEqual(["Votes split"]);
    expect(texts(".round:last-child .votes li > :first-child")).toEqual(["Alex", "Dmitry"]);
    expect(texts(".round:last-child .votes li > .card-value")).toEqual(["1h", "1d"]);
  });

  it("marks the card most people picked", () => {
    openPanel();

    expect(element(".round:first-child .tally .badge")!.classList).toContain("leader");
    expect(element(".round:last-child .tally .badge")!.classList).toContain("text-bg-secondary");
  });

  it("closes with the cross, a click beside the panel and Escape", () => {
    openPanel();
    expect(element(".history-panel")!.classList).toContain("open");
    element(".history-panel .history-close")!.click();
    fixture.detectChanges();
    expect(element(".history-panel")!.classList).not.toContain("open");
    expect(element(".history-backdrop")).toBeNull();

    openPanel();
    element(".history-backdrop")!.click();
    fixture.detectChanges();
    expect(element(".history-panel")!.classList).not.toContain("open");

    openPanel();
    document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
    fixture.detectChanges();
    expect(element(".history-panel")!.classList).not.toContain("open");
  });

  it("keeps a click inside the panel from closing it", () => {
    openPanel();
    element(".history-panel .round")!.click();
    fixture.detectChanges();

    expect(element(".history-panel")!.classList).toContain("open");
  });

  it("slides the panel in from the right and keeps it out of reach while closed", () => {
    const panel = element(".history-panel")!;
    expect(getComputedStyle(panel).transform).not.toBe("none");
    expect(getComputedStyle(panel).transitionProperty).toContain("transform");

    openPanel();

    expect(panel.classList).toContain("open");
    expect(getComputedStyle(panel).visibility).toBe("visible");
  });

  it("offers the history as Excel, CSV, text and XML files", () => {
    openPanel();
    element(".history-export [ngbDropdownToggle]")!.click();
    fixture.detectChanges();

    expect(texts(".history-export [ngbDropdownItem]")).toEqual(["Excel (.xlsx)", "CSV (.csv)", "Text (.txt)", "XML (.xml)"]);
  });

  it("downloads the rounds oldest first in a file named after the room", async () => {
    const files: { name: string; blob: Blob }[] = [];
    let blob: Blob | undefined;
    spyOn(URL, "createObjectURL").and.callFake(object => {
      blob = object as Blob;
      return "blob:history";
    });
    spyOn(HTMLAnchorElement.prototype, "click").and.callFake(function (this: HTMLAnchorElement) {
      files.push({name: this.download, blob: blob!});
    });

    await fixture.componentInstance.download("csv", await firstValueFrom(fixture.componentInstance.rounds$));

    expect(files.length).toBe(1);
    expect(files[0].name).toMatch(/^Sprint 12 history \d{4}-\d\d-\d\d \d\d-\d\d\.csv$/);
    expect(files[0].blob.type).toBe("text/csv;charset=utf-8");
    const lines = (await files[0].blob.text()).split("\r\n");
    expect(lines.slice(1, 5).map(line => line.split(",")[0])).toEqual(["1", "1", "2", "2"]);
  });

  it("offers no download before the first round is revealed", () => {
    store.setState(appState());
    fixture.detectChanges();
    openPanel();

    expect(element(".history-export")).toBeNull();
  });

  it("names a round by its task, keeps its number small and shows the accepted estimate", () => {
    store.setState(appState({room: room({deck: {cards: cards("1h", "1d")}, history: [
      {...history[0], task: {name: "PIP-25 Task name", url: "https://example.com/PIP-25"}, estimate: "1d"},
      {...history[1], task: {name: "PIP-26"}}
    ]})}));
    fixture.detectChanges();
    openPanel();

    expect(texts(".round-head .round-task")).toEqual(["PIP-26", "PIP-25 Task name"]);
    expect(texts(".round-when")[0]).toMatch(/^Round 2 · /);
    const link = element(".round:last-child a.round-task") as HTMLAnchorElement;
    expect(link.href).toBe("https://example.com/PIP-25");
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    expect(texts(".round:last-child .estimate")).toEqual(["Estimate: 1d"]);
    expect(element(".round:last-child .result")).toBeNull();
    expect(texts(".round:first-child .result")).toEqual(["Result: 1d"]);
  });

  it("tells that the history is empty before the first round is revealed", () => {
    store.setState(appState());
    fixture.detectChanges();
    openPanel();

    expect(texts(".history-toggle")).toEqual(["History"]);
    expect(texts(".history-panel p")).toEqual(["Revealed rounds will appear here."]);
  });
});
