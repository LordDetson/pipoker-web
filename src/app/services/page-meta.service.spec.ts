import {TestBed} from "@angular/core/testing";
import {PageMetaService} from "./page-meta.service";

describe("PageMetaService", () => {
  let description: HTMLMetaElement;
  let canonical: HTMLLinkElement;
  let service: PageMetaService;

  beforeEach(() => {
    description = document.createElement("meta");
    description.name = "description";
    description.content = "Start page";
    document.head.appendChild(description);
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = "https://pipoker.app/";
    document.head.appendChild(canonical);
    service = TestBed.inject(PageMetaService);
  });

  afterEach(() => {
    description.remove();
    canonical.remove();
    document.title = "";
  });

  it("sets the title, the description and the canonical address of a page", () => {
    service.set({title: "Guide | PiPoker", description: "How to run Planning Poker", path: "/guide"});

    expect(document.title).toBe("Guide | PiPoker");
    expect(description.content).toBe("How to run Planning Poker");
    expect(canonical.href).toBe("https://pipoker.app/guide");
  });

  it("gives the start page's tags back", () => {
    service.set({title: "Guide | PiPoker", description: "How to run Planning Poker", path: "/guide"});

    service.reset("Start page");

    expect(document.title).toBe("PiPoker");
    expect(description.content).toBe("Start page");
    expect(canonical.href).toBe("https://pipoker.app/");
  });
});
