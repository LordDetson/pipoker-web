import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {Chart} from "chart.js";
import {loadDoughnutChart, VotingResultChartComponent} from "./voting-result-chart.component";
import {ThemeService} from "../../services/theme.service";
import {appState, room, votes} from "../../testing/test-data";

describe("VotingResultChartComponent", () => {
  let fixture: ComponentFixture<VotingResultChartComponent>;
  let store: MockStore;
  let initialTheme: string | null;

  beforeEach(async () => {
    initialTheme = document.body.getAttribute("data-bs-theme");
    localStorage.clear();
    TestBed.configureTestingModule({
      declarations: [VotingResultChartComponent],
      providers: [provideMockStore({
        initialState: appState({room: room({votingResult: {map: votes({Dmitry: "1d", Alex: "1h", Kate: "1d"})}})})
      })]
    });
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(VotingResultChartComponent);
    // Chart.js is loaded on demand. Once it is loaded, the component draws the chart in a microtask after the first
    // change detection, so the test lets every microtask run before it looks at the chart.
    await loadDoughnutChart();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve));
  });

  afterEach(() => {
    localStorage.clear();
    document.body.setAttribute("data-bs-theme", initialTheme ?? "dark");
  });

  function chart(): Chart<"doughnut"> {
    return Chart.getChart(fixture.nativeElement.querySelector("canvas")) as Chart<"doughnut">;
  }

  function datalabelsColor(): unknown {
    return (chart().options.plugins as any).datalabels.color;
  }

  it("draws the votes for every card", () => {
    expect(chart().data.labels).toEqual(["1d", "1h"]);
    expect(chart().data.datasets.map(dataset => dataset.data)).toEqual([[2, 1]]);
  });

  it("redraws when the votes change", () => {
    store.setState(appState({room: room({votingResult: {map: votes({Dmitry: "3d"})}})}));

    expect(chart().data.labels).toEqual(["3d"]);
    expect(chart().data.datasets.map(dataset => dataset.data)).toEqual([[1]]);
  });

  it("labels every part of the chart with the card and its count", () => {
    const formatter = (fixture.componentInstance.doughnutChartOptions.plugins as any).datalabels.formatter;

    expect(formatter(2, {chart: {data: {labels: ["1d", "1h"]}}, dataIndex: 0})).toBe("1d: 2");
    expect(formatter(2, {chart: {data: {}}, dataIndex: 0})).toBe(2);
  });

  it("colours the labels for the theme", () => {
    expect(datalabelsColor()).toBe("#ffffff");

    TestBed.inject(ThemeService).toggle();

    expect(datalabelsColor()).toBe("#343a40");
  });

  it("frees the canvas when it is removed", () => {
    const canvas = fixture.nativeElement.querySelector("canvas");

    fixture.destroy();

    expect(Chart.getChart(canvas)).toBeUndefined();
  });
});
