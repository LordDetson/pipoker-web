import {ArcElement, Chart, Colors, DoughnutController, Tooltip} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Chart.js is the largest library of the client and is needed only once the cards are revealed, so this file is
// loaded apart from the application, see loadDoughnutChart. Only the parts of Chart.js the doughnut needs are taken.
Chart.register(DoughnutController, ArcElement, Colors, Tooltip, ChartDataLabels);

export {Chart};
