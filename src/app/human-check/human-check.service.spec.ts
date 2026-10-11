import {fakeAsync, flushMicrotasks, TestBed, tick} from "@angular/core/testing";
import {HumanCheckService, TOKEN_WAIT_MS, Turnstile, TurnstileOptions} from "./human-check.service";
import {environment} from "../../env/env";

describe("HumanCheckService", () => {
  let service: HumanCheckService;
  let fetchSpy: jasmine.Spy<typeof fetch>;
  let turnstile: jasmine.SpyObj<Turnstile>;
  let container: HTMLElement;

  // What the page told Turnstile when it rendered the widget
  function options(): TurnstileOptions {
    return turnstile.render.calls.mostRecent().args[1];
  }

  beforeEach(() => {
    service = TestBed.inject(HumanCheckService);
    fetchSpy = spyOn(window, "fetch");
    turnstile = jasmine.createSpyObj<Turnstile>("Turnstile", ["render", "reset", "remove"]);
    turnstile.render.and.returnValue("widget-1");
    // The script counts as loaded, so the tests don't reach Cloudflare
    window.turnstile = turnstile;
    container = document.createElement("div");
  });

  afterEach(() => {
    delete window.turnstile;
  });

  // Not a real Response: reading its body would settle outside the fake clock
  function serverAnswers(siteKey: string | null): void {
    fetchSpy.and.callFake(() => Promise.resolve({ok: true, json: () => Promise.resolve({siteKey})} as Response));
  }

  it("runs Turnstile unseen with the server's site key, for the action", fakeAsync(() => {
    serverAnswers("site-1");

    service.start(container, "feedback");
    flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledOnceWith(environment.apiUrl + "/human-check");
    expect(turnstile.render).toHaveBeenCalledOnceWith(container, jasmine.objectContaining({
      sitekey: "site-1",
      action: "feedback",
      appearance: "interaction-only"
    }));
  }));

  it("gives the token once the check finishes", fakeAsync(() => {
    serverAnswers("site-1");
    const run = service.start(container, "feedback");
    flushMicrotasks();
    let token: string | undefined = "none yet";

    run.token().then(given => token = given);
    flushMicrotasks();
    expect(token).toBe("none yet");

    options().callback("token-1");
    flushMicrotasks();
    expect(token).toBe("token-1");
  }));

  it("gives nothing when the check is off on the server, and doesn't load Cloudflare's script", fakeAsync(() => {
    serverAnswers(null);
    const run = service.start(container, "feedback");
    let token: string | undefined = "none yet";

    run.token().then(given => token = given);
    flushMicrotasks();

    expect(token).toBeUndefined();
    expect(turnstile.render).not.toHaveBeenCalled();
  }));

  it("gives nothing when the server can't be reached, and asks it again for the next form", fakeAsync(() => {
    fetchSpy.and.rejectWith(new TypeError("Failed to fetch"));
    let token: string | undefined = "none yet";

    service.start(container, "feedback").token().then(given => token = given);
    flushMicrotasks();
    expect(token).toBeUndefined();

    serverAnswers("site-1");
    service.start(container, "feedback");
    flushMicrotasks();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(turnstile.render).toHaveBeenCalled();
  }));

  it("doesn't keep the person waiting when the check fails", fakeAsync(() => {
    serverAnswers("site-1");
    const run = service.start(container, "feedback");
    flushMicrotasks();
    let token: string | undefined = "none yet";

    run.token().then(given => token = given);
    expect(options()["error-callback"]()).toBeTrue();
    flushMicrotasks();

    expect(token).toBeUndefined();
  }));

  it("stops waiting for a check that doesn't finish", fakeAsync(() => {
    serverAnswers("site-1");
    const run = service.start(container, "feedback");
    flushMicrotasks();
    let token: string | undefined = "none yet";

    run.token().then(given => token = given);
    tick(TOKEN_WAIT_MS);

    expect(token).toBeUndefined();
  }));

  it("gets a new token after a reset, since a token passes once", fakeAsync(() => {
    serverAnswers("site-1");
    const run = service.start(container, "feedback");
    flushMicrotasks();
    options().callback("token-1");

    run.reset();
    let token: string | undefined = "none yet";
    run.token().then(given => token = given);
    flushMicrotasks();

    expect(turnstile.reset).toHaveBeenCalledOnceWith("widget-1");
    expect(token).toBe("none yet");
    options().callback("token-2");
    flushMicrotasks();
    expect(token).toBe("token-2");
  }));

  it("removes the widget with the form, and doesn't render one for a form already closed", fakeAsync(() => {
    serverAnswers("site-1");
    const run = service.start(container, "feedback");
    flushMicrotasks();

    run.remove();
    expect(turnstile.remove).toHaveBeenCalledOnceWith("widget-1");

    service.start(container, "feedback").remove();
    flushMicrotasks();
    expect(turnstile.render).toHaveBeenCalledTimes(1);
  }));
});
