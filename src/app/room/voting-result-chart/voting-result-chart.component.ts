import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import type {Chart, ChartData, ChartOptions} from "chart.js";
import {Observable, Subscription} from "rxjs";
import {VotingResult} from "../../models/voting-result.model";
import * as RoomSelector from "../../store/room/room.selector";
import {Store} from "@ngrx/store";
import {ThemeService} from "../../services/theme.service";

let doughnutChart: Promise<typeof import("./doughnut-chart")> | undefined;

// Loads Chart.js once; after a failure, for example a lost connection, the next call tries again
export function loadDoughnutChart(): Promise<typeof import("./doughnut-chart")> {
  return doughnutChart ??= import("./doughnut-chart").catch(error => {
    doughnutChart = undefined;
    throw error;
  });
}

@Component({
  selector: 'app-voting-result-chart',
  templateUrl: './voting-result-chart.component.html',
  styleUrls: ['./voting-result-chart.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class VotingResultChartComponent implements AfterViewInit, OnDestroy {

  @ViewChild("canvas") canvas: ElementRef<HTMLCanvasElement>;

  public doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };

  public doughnutChartOptions: ChartOptions<'doughnut'> = {
    rotation: -90,
    cutout: "30%",
    circumference: 180,
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      arc: {
        borderWidth: 0
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 800,
      easing: "easeOutCirc"
    },
    plugins: {
      legend: {
        display: false
      },
      datalabels: {
        formatter: function(value, context) {
          return context.chart.data.labels ? context.chart.data.labels[context.dataIndex] + ": " + value : value;
        },
        font: {
          family: "Rubik Medium",
          size: 16
        },
        textAlign: "center",
        align: "end"
      }
    }
  }

  votingResult$: Observable<VotingResult> = this.store.select(RoomSelector.votingResultSelector);

  private chart?: Chart<'doughnut'>;

  private readonly subscriptions = new Subscription();

  private destroyed = false;

  constructor(
    private store: Store,
    private theme: ThemeService
  ) {
  }

  async ngAfterViewInit(): Promise<void> {
    // Both emit at once, so the chart is drawn with the votes and the label colour from the start
    this.subscriptions.add(this.votingResult$.subscribe(votingResult => {
      this.doughnutChartData.labels = [];
      this.doughnutChartData.datasets = [];
      let countOfVotes : number[] = [];
      votingResult.map.forEach((card, key) => {
        const index : number = this.doughnutChartData.labels!.indexOf(card.value);
        if (index > -1) {
          countOfVotes.splice(index, 1, countOfVotes.at(index)! + 1);
        } else {
          this.doughnutChartData.labels!.push(card.value);
          countOfVotes.push(1)
        }
      })
      this.doughnutChartData.datasets.push({data: countOfVotes});
      this.chart?.update();
    }));
    this.subscriptions.add(this.theme.isLight$.subscribe(isLight => {
      this.doughnutChartOptions.plugins!.datalabels!.color = isLight ? "#343a40" : "#ffffff";
      this.chart?.update();
    }));
    const {Chart} = await loadDoughnutChart();
    if (this.destroyed) {
      return;
    }
    this.chart = new Chart(this.canvas.nativeElement, {
      type: "doughnut",
      data: this.doughnutChartData,
      options: this.doughnutChartOptions
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscriptions.unsubscribe();
    this.chart?.destroy();
  }
}
