import {Injector} from "@angular/core";

// Opens the bug report form. Its code is loaded on the first report, not with the site: few people ever need it.
export async function openBugReport(injector: Injector): Promise<void> {
  const {showBugReportForm} = await import("./bug-report.component");
  showBugReportForm(injector);
}
