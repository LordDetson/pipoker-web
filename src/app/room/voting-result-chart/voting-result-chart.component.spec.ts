// Brings in the chart options of the datalabels plugin, which the application registers in AppModule.
import "chartjs-plugin-datalabels";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {VotingResultChartComponent} from "./voting-result-chart.component";
import {appState, room, votes} from "../../testing/test-data";

describe("VotingResultChartComponent", () => {
  let fixture: ComponentFixture<VotingResultChartComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VotingResultChartComponent],
      providers: [provideMockStore({
        initialState: appState({room: room({votingResult: {map: votes({Dmitry: "1d", Alex: "1h", Kate: "1d"})}})})
      })],
      schemas: [NO_ERRORS_SCHEMA]
    });
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(VotingResultChartComponent);
    fixture.detectChanges();
  });

  it("counts the votes for every card", () => {
    const data = fixture.componentInstance.doughnutChartData;

    expect(data.labels).toEqual(["1d", "1h"]);
    expect(data.datasets.map(dataset => dataset.data)).toEqual([[2, 1]]);
  });

  it("recounts when the votes change", () => {
    store.setState(appState({room: room({votingResult: {map: votes({Dmitry: "3d"})}})}));

    const data = fixture.componentInstance.doughnutChartData;
    expect(data.labels).toEqual(["3d"]);
    expect(data.datasets.map(dataset => dataset.data)).toEqual([[1]]);
  });

  it("labels every part of the chart with the card and its count", () => {
    const formatter = (fixture.componentInstance.doughnutChartOptions.plugins as any).datalabels.formatter;

    expect(formatter(2, {chart: {data: {labels: ["1d", "1h"]}}, dataIndex: 0})).toBe("1d: 2");
    expect(formatter(2, {chart: {data: {}}, dataIndex: 0})).toBe(2);
  });

  it("hides the animation workaround once initialized", () => {
    const workaround: HTMLElement = fixture.nativeElement.querySelector("div[style]");

    expect(workaround.style.display).toBe("none");
  });
});
