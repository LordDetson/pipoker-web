import {Injectable} from "@angular/core";
import {environment} from "../../env/env";

// What the server takes: what the person wrote and what the page adds by itself
export interface BugReport {
  message: string;
  contact: string;
  page: string;
  roomId?: string;
  browser: string;
  language: string;
  browserLanguages: string;
  screen: string;
  window: string;
  time: string;
  timeZone: string;
}

// Sent: the server passed the report on. Limited: the browser sent too many reports lately. Failed: anything else.
export type BugReportResult = "sent" | "limited" | "failed";

// Like "2026-10-05 17:05:00 +03:00": the person's local time, which they will mention if they write back
export function localTime(date: Date): string {
  const pad = (value: number) => String(Math.abs(value)).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} `
    + `${offset < 0 ? "-" : "+"}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
}

// The page, the browser and the time, cut to the server's limits. Nothing about the room's people or votes.
export function describeBrowser(language: string, now: Date): Omit<BugReport, "message" | "contact" | "roomId"> {
  return {
    page: location.href.slice(0, 500),
    browser: navigator.userAgent.slice(0, 500),
    language,
    browserLanguages: (navigator.languages?.length ? navigator.languages : [navigator.language]).join(", ").slice(0, 100),
    screen: `${screen.width}x${screen.height}`,
    window: `${window.innerWidth}x${window.innerHeight}`,
    time: localTime(now),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 60)
  };
}

@Injectable({providedIn: "root"})
export class BugReportService {

  // Plain HTTP rather than the room's connection, so that a report gets through when the page can't connect
  async send(report: BugReport): Promise<BugReportResult> {
    try {
      const response = await fetch(environment.apiUrl + "/bug-reports", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(report)
      });
      if (response.ok) {
        return "sent";
      }
      return response.status === 429 ? "limited" : "failed";
    } catch {
      return "failed";
    }
  }
}
