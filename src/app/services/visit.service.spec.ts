import {TestBed} from "@angular/core/testing";
import {VisitService} from "./visit.service";
import {environment} from "../../env/env";

describe("VisitService", () => {
  let service: VisitService;
  let fetchSpy: jasmine.Spy<typeof fetch>;

  beforeEach(() => {
    sessionStorage.clear();
    service = TestBed.inject(VisitService);
    fetchSpy = spyOn(window, "fetch").and.resolveTo(new Response(null, {status: 204}));
  });

  afterEach(() => sessionStorage.clear());

  it("reports the link's from parameter and the referring page", () => {
    service.report("?from=habr&utm=1", "https://habr.com/ru/articles/1/");

    expect(fetchSpy).toHaveBeenCalledOnceWith(environment.apiUrl + "/visits", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({from: "habr", referrer: "https://habr.com/ru/articles/1/"})
    });
    expect(service.source).toEqual({from: "habr", referrer: "https://habr.com/ru/articles/1/"});
  });

  it("reports a visit with nothing known about it as it is", () => {
    service.report("", "");

    expect(fetchSpy.calls.mostRecent().args[1]!.body).toBe("{}");
    expect(service.source).toEqual({});
  });

  it("reports once per tab", () => {
    service.report("?from=tg", "");
    service.report("", "https://example.com/");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(service.source).toEqual({from: "tg"});
  });

  it("doesn't report again when the server can't be reached", () => {
    fetchSpy.and.rejectWith(new TypeError("Failed to fetch"));

    service.report("?from=vk", "");
    service.report("?from=vk", "");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("knows no source before a visit is reported", () => {
    expect(service.source).toBeUndefined();
  });
});
