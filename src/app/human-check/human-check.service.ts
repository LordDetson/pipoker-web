import {Injectable} from "@angular/core";
import {environment} from "../../env/env";

// The part of Cloudflare Turnstile's script the page uses, see
// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
export interface Turnstile {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

export interface TurnstileOptions {
  sitekey: string;
  action: string;
  // Shows nothing unless Cloudflare needs the person to do something; the Invisible widget never does
  appearance: "interaction-only";
  callback: (token: string) => void;
  // Returning true tells Turnstile the error is handled, so it doesn't throw it into the console
  "error-callback": () => boolean;
  "expired-callback": () => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// How long sending waits for the check to finish; then the message goes without a token and the server decides
export const TOKEN_WAIT_MS = 10_000;

// What the page needs to run the check: the server's site key and Cloudflare's script
interface Setup {
  siteKey: string;
  turnstile: Turnstile;
}

// One check, run in the background while the person fills in a form. The person sees nothing: the Turnstile widget
// is Invisible. The token it gives is sent with the form, and the server asks Cloudflare whether it is a person's.
export class HumanCheckRun {

  private widgetId?: string;
  private turnstile?: Turnstile;
  // The check gives nothing: it is off on this server, or the page couldn't start it
  private off = false;
  private removed = false;
  // The last try failed, and Turnstile is trying again
  private failing = false;
  private latest?: string;
  private waiting: ((token: string | undefined) => void)[] = [];

  constructor(setup: Promise<Setup | undefined>, container: HTMLElement, action: string) {
    setup.then(ready => {
      if (!ready) {
        this.giveUp();
        return;
      }
      if (this.removed) {
        return;
      }
      this.turnstile = ready.turnstile;
      this.widgetId = ready.turnstile.render(container, {
        sitekey: ready.siteKey,
        action,
        appearance: "interaction-only",
        callback: token => {
          this.latest = token;
          this.failing = false;
          this.wake(token);
        },
        // Turnstile tries again by itself; until it succeeds, sending doesn't wait for it
        "error-callback": () => {
          this.failing = true;
          this.wake(undefined);
          return true;
        },
        // Turnstile gets a new token by itself
        "expired-callback": () => this.latest = undefined
      });
    }, () => this.giveUp());
  }

  // What the check gave; undefined when it is off, failed or didn't finish in time
  token(): Promise<string | undefined> {
    if (this.latest || this.off || this.failing) {
      return Promise.resolve(this.latest);
    }
    return new Promise(resolve => {
      const timer = setTimeout(() => finish(undefined), TOKEN_WAIT_MS);
      const finish = (token: string | undefined) => {
        clearTimeout(timer);
        resolve(token);
      };
      this.waiting.push(finish);
    });
  }

  // A token passes once, so a form sent again needs a new one
  reset(): void {
    this.latest = undefined;
    if (this.widgetId !== undefined) {
      this.turnstile!.reset(this.widgetId);
    }
  }

  remove(): void {
    this.removed = true;
    if (this.widgetId !== undefined) {
      this.turnstile!.remove(this.widgetId);
      this.widgetId = undefined;
    }
  }

  private giveUp(): void {
    this.off = true;
    this.wake(undefined);
  }

  private wake(token: string | undefined): void {
    const waiting = this.waiting;
    this.waiting = [];
    waiting.forEach(finish => finish(token));
  }
}

// Runs Cloudflare Turnstile where the server has its keys (see /api/human-check in pipoker-app). The script loads
// with the first form that needs it, not with the site, so the pages people only look at don't talk to Cloudflare.
@Injectable({providedIn: "root"})
export class HumanCheckService {

  private setup?: Promise<Setup | undefined>;

  // Starts the check in the container: the form's own element, where Cloudflare's frame stays hidden
  start(container: HTMLElement, action: string): HumanCheckRun {
    this.setup ??= this.load();
    return new HumanCheckRun(this.setup, container, action);
  }

  private async load(): Promise<Setup | undefined> {
    try {
      const response = await fetch(environment.apiUrl + "/human-check");
      if (!response.ok) {
        throw new Error(`The server answered ${response.status}`);
      }
      const {siteKey} = await response.json();
      if (!siteKey) {
        return undefined;
      }
      return {siteKey, turnstile: await loadTurnstile()};
    } catch {
      // The next form tries again
      this.setup = undefined;
      return undefined;
    }
  }
}

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile didn't start"));
    script.onerror = () => {
      script.remove();
      reject(new Error("Turnstile didn't load"));
    };
    document.head.appendChild(script);
  });
}
