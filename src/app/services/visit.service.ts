import {Inject, Injectable, PLATFORM_ID} from "@angular/core";
import {isPlatformBrowser} from "@angular/common";
import {environment} from "../../env/env";

// Where a page was opened from, as the page knows it. The server turns it into one of a fixed set of sources
// and keeps nothing else, see /api/visits in pipoker-app
export interface VisitDto {
  // The from parameter of the link that opened the page: the links PiPoker is announced with carry one
  from?: string;
  // The address of the referring page
  referrer?: string;
}

const VISIT_KEY = "visit";

// Tells the server where the visitor came from, once per tab, so the activity dashboard shows which channel
// brings people and which brings rooms. A refresh or a walk between the pages of the tab is the same visit.
@Injectable({providedIn: "root"})
export class VisitService {

  constructor(@Inject(PLATFORM_ID) private platform: Object) {
  }

  // Called by the pages a visitor lands on (the start page and the guide), not by a room, which people get
  // to by an invitation. The page's own address and referrer are taken unless given.
  report(search?: string, referrer?: string): void {
    // The build prerenders the pages without a browser: that is no visit
    if (!isPlatformBrowser(this.platform) || this.source !== undefined) {
      return;
    }
    const visit: VisitDto = {};
    const from = new URLSearchParams(search ?? location.search).get("from")?.trim();
    if (from) {
      visit.from = from;
    }
    referrer ??= document.referrer;
    if (referrer) {
      visit.referrer = referrer;
    }
    // Remembered before sending, so a page that can't reach the server doesn't report the visit again
    this.remember(visit);
    // Plain HTTP rather than the room's connection: a visit is counted whether or not a room follows
    fetch(environment.apiUrl + "/visits", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(visit)
    }).catch(() => {
      // Nothing to do: the visit isn't worth telling the person about
    });
  }

  // The reported source of this tab, for the rooms created in it; undefined before a visit is reported
  get source(): VisitDto | undefined {
    try {
      const stored = sessionStorage.getItem(VISIT_KEY);
      return stored === null ? undefined : JSON.parse(stored);
    } catch {
      return undefined;
    }
  }

  private remember(visit: VisitDto): void {
    try {
      sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
    } catch {
      // Storage may be unavailable; then every page of the tab reports a visit, which is a small error
    }
  }
}
