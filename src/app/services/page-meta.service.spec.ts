import {TestBed} from "@angular/core/testing";
import {PageMetaService} from "./page-meta.service";
import {BROWSER_LANGUAGES, I18nService} from "../i18n/i18n.service";

describe("PageMetaService", () => {
  let description: HTMLMetaElement;
  let canonical: HTMLLinkElement;
  let ogUrl: HTMLMetaElement;
  let ogTitle: HTMLMetaElement;
  let ogLocale: HTMLMetaElement;
  let service: PageMetaService;

  function meta(attribute: "name" | "property", value: string): HTMLMetaElement {
    const element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
    return element;
  }

  function alternate(hreflang: string): string {
    return document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`)!.href;
  }

  beforeEach(() => {
    description = meta("name", "description");
    ogUrl = meta("property", "og:url");
    ogTitle = meta("property", "og:title");
    ogLocale = meta("property", "og:locale");
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = "https://pipoker.app/";
    document.head.appendChild(canonical);
    TestBed.configureTestingModule({providers: [{provide: BROWSER_LANGUAGES, useValue: ["en-US"]}]});
    service = TestBed.inject(PageMetaService);
  });

  afterEach(() => {
    [description, canonical, ogUrl, ogTitle, ogLocale].forEach(element => element.remove());
    document.head.querySelectorAll('link[rel="alternate"]').forEach(link => link.remove());
    document.title = "";
  });

  it("sets the title, the description and the canonical address of a page, for search and for link previews", () => {
    service.set({title: "Guide | PiPoker", description: "How to run Planning Poker", page: "/guide"});

    expect(document.title).toBe("Guide | PiPoker");
    expect(description.content).toBe("How to run Planning Poker");
    expect(canonical.href).toBe("https://pipoker.app/guide");
    expect(ogUrl.content).toBe("https://pipoker.app/guide");
    expect(ogTitle.content).toBe("Guide | PiPoker");
    expect(ogLocale.content).toBe("en_US");
  });

  it("names the page's address in each language, and the one without a language for everyone else", () => {
    service.set({title: "PiPoker", description: "Start page", page: "/"});

    expect(alternate("ru")).toBe("https://pipoker.app/ru");
    expect(alternate("en")).toBe("https://pipoker.app/en");
    expect(alternate("x-default")).toBe("https://pipoker.app/");
    expect(document.head.querySelectorAll('link[rel="alternate"]').length).toBe(3);

    service.set({title: "Guide | PiPoker", description: "How to run Planning Poker", page: "/guide"});

    expect(alternate("ru")).toBe("https://pipoker.app/ru/guide");
    expect(document.head.querySelectorAll('link[rel="alternate"]').length).toBe(3);
  });

  it("takes the address with a language as the canonical one on a page opened by it", () => {
    TestBed.inject(I18nService).useAddressLanguage("ru");

    service.set({title: "PiPoker", description: "Start page", page: "/"});

    expect(canonical.href).toBe("https://pipoker.app/ru");
    expect(ogUrl.content).toBe("https://pipoker.app/ru");
    expect(ogLocale.content).toBe("ru_RU");
  });
});
