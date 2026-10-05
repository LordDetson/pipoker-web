import {TestBed} from "@angular/core/testing";
import {BugReport, BugReportService, describeBrowser, localTime} from "./bug-report.service";
import {environment} from "../../env/env";

describe("BugReportService", () => {
  let service: BugReportService;
  let fetchSpy: jasmine.Spy<typeof fetch>;

  const report: BugReport = {
    message: "The cards don't turn over", contact: "@alex", page: "http://localhost/", browser: "Firefox",
    language: "en", browserLanguages: "en", screen: "1920x1080", window: "1366x768",
    time: "2026-10-05 17:05:00 +03:00", timeZone: "Europe/Minsk"
  };

  beforeEach(() => {
    service = TestBed.inject(BugReportService);
    fetchSpy = spyOn(window, "fetch");
  });

  it("posts the report to the server", async () => {
    fetchSpy.and.resolveTo(new Response(null, {status: 204}));

    expect(await service.send(report)).toBe("sent");
    expect(fetchSpy).toHaveBeenCalledOnceWith(environment.apiUrl + "/bug-reports", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(report)
    });
  });

  it("tells when the browser sent too many reports", async () => {
    fetchSpy.and.resolveTo(new Response(null, {status: 429}));

    expect(await service.send(report)).toBe("limited");
  });

  it("tells when the server didn't pass the report on", async () => {
    fetchSpy.and.resolveTo(new Response(null, {status: 503}));

    expect(await service.send(report)).toBe("failed");
  });

  it("tells when the server can't be reached", async () => {
    fetchSpy.and.rejectWith(new TypeError("Failed to fetch"));

    expect(await service.send(report)).toBe("failed");
  });
});

describe("localTime", () => {
  it("writes the local time with its offset", () => {
    const date = new Date(2026, 9, 5, 7, 5, 9);
    const offset = -date.getTimezoneOffset();
    const sign = offset < 0 ? "-" : "+";
    const hours = String(Math.trunc(Math.abs(offset) / 60)).padStart(2, "0");
    const minutes = String(Math.abs(offset) % 60).padStart(2, "0");

    expect(localTime(date)).toBe(`2026-10-05 07:05:09 ${sign}${hours}:${minutes}`);
  });
});

describe("describeBrowser", () => {
  it("adds the page, the browser and the time, but nothing about the room's people", () => {
    const details = describeBrowser("ru", new Date(2026, 9, 5, 17, 5, 0));

    expect(details.page).toBe(location.href);
    expect(details.browser).toBe(navigator.userAgent);
    expect(details.language).toBe("ru");
    expect(details.browserLanguages).toBe(navigator.languages.join(", "));
    expect(details.screen).toBe(`${screen.width}x${screen.height}`);
    expect(details.window).toBe(`${window.innerWidth}x${window.innerHeight}`);
    expect(details.time).toMatch(/^2026-10-05 17:05:00 [+-]\d\d:\d\d$/);
    expect(details.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(Object.keys(details)).toEqual(["page", "browser", "language", "browserLanguages", "screen", "window", "time", "timeZone"]);
  });
});
