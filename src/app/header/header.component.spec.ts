import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {Clipboard} from "@angular/cdk/clipboard";
import {COMPACT_STEPS, HeaderComponent} from "./header.component";
import {appState, room, roomState} from "../testing/test-data";
import {environment} from "../../env/env";
import {AppConstants} from "../common/app-constants";
import {NgbDropdownModule} from "@ng-bootstrap/ng-bootstrap";
import {TranslatePipe} from "../i18n/translate.pipe";
import {ThemeSwitcherComponent} from "./theme-switcher/theme-switcher.component";
import {provideRouter, RouterLink} from "@angular/router";

describe("HeaderComponent", () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;
  let clipboard: jasmine.SpyObj<Clipboard>;

  beforeEach(() => {
    localStorage.removeItem(AppConstants.language);
    clipboard = jasmine.createSpyObj<Clipboard>("Clipboard", ["copy"]);
    TestBed.configureTestingModule({
      declarations: [HeaderComponent, ThemeSwitcherComponent],
      imports: [TranslatePipe, NgbDropdownModule, RouterLink],
      providers: [
        provideRouter([]),
        provideMockStore({initialState: appState({room: room({id: "room-1", name: "Planning"})})}),
        {provide: Clipboard, useValue: clipboard}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    TestBed.overrideComponent(ThemeSwitcherComponent, {set: {template: "<span class=\"theme-switcher\"></span>"}});
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderComponent);
    // Wide enough for everything, whatever the size of the test browser's window
    fixture.nativeElement.style.width = "1600px";
    fixture.detectChanges();
  });

  function copyButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector("button.invitation-link");
  }

  it("shows the room name and the invitation button inside a room", () => {
    expect(fixture.nativeElement.textContent).toContain("Planning");
    expect(copyButton()?.textContent).toContain("Invite");
  });

  it("shows neither outside a room", () => {
    store.setState({...appState(), roomState: roomState({room: room({id: "", name: ""})})});
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector("strong.text-center")).toBeNull();
    expect(copyButton()).toBeNull();
  });

  afterEach(() => localStorage.removeItem(AppConstants.language));

  function guideLink(): HTMLAnchorElement | null {
    return fixture.nativeElement.querySelector("a.guide-link");
  }

  it("leads to the guide outside a room, where nobody is at a table to leave", () => {
    expect(guideLink()).toBeNull();

    store.setState({...appState(), roomState: roomState({room: room({id: "", name: ""})})});
    fixture.detectChanges();

    expect(guideLink()?.getAttribute("href")).toBe("/guide");
    expect(guideLink()?.textContent?.trim()).toBe("Guide");
    expect(guideLink()?.title).toBe("How to run Planning Poker");
  });

  it("says what PiPoker is under its name", () => {
    expect(fixture.nativeElement.querySelector(".tagline").textContent).toBe("Free Planning Poker for teams");
  });

  function languageToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(".language-select [ngbDropdownToggle]");
  }

  function languageItems(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(".language-select [ngbDropdownItem]"));
  }

  function chooseLanguage(code: string): void {
    languageToggle().click();
    fixture.detectChanges();
    languageItems().find(item => item.lang === code)!.click();
    fixture.detectChanges();
  }

  it("shows the current language with its flag and offers the others in a menu", () => {
    expect(languageToggle().textContent!.trim()).toBe("EN");
    expect(languageToggle().querySelector("img")!.getAttribute("src")).toBe("/assets/svg/flags/gb.svg");

    languageToggle().click();
    fixture.detectChanges();

    expect(languageItems().map(item => item.textContent!.trim())).toEqual(["Русский", "English"]);
    expect(languageItems().map(item => item.querySelector("img")!.getAttribute("src")))
      .toEqual(["/assets/svg/flags/ru.svg", "/assets/svg/flags/gb.svg"]);
    expect(languageItems().find(item => item.classList.contains("active"))!.lang).toBe("en");
  });

  it("switches the interface between English and Russian", () => {
    chooseLanguage("ru");

    expect(fixture.nativeElement.querySelector(".tagline").textContent).toBe("Бесплатный Planning Poker для команд");
    expect(copyButton()?.textContent).toContain("Пригласить");
    expect(supportLink()?.textContent?.trim()).toMatch(/^♥\s*Поддержать$/);
    expect(languageToggle().textContent!.trim()).toBe("RU");
    expect(languageToggle().querySelector("img")!.getAttribute("src")).toBe("/assets/svg/flags/ru.svg");

    chooseLanguage("en");

    expect(fixture.nativeElement.querySelector(".tagline").textContent).toBe("Free Planning Poker for teams");
  });

  function supportLink(): HTMLAnchorElement | null {
    return fixture.nativeElement.querySelector("a.support-link");
  }

  it("opens the support page in a new tab", () => {
    expect(supportLink()?.href).toBe(environment.supportUrl);
    expect(supportLink()?.target).toBe("_blank");
    expect(supportLink()?.rel).toBe("noopener");
    expect(supportLink()?.textContent?.trim()).toMatch(/^♥\s*Support$/);
  });

  it("shows no support link while no support page is set", () => {
    fixture.componentInstance.supportUrl = "";
    fixture.detectChanges();

    expect(supportLink()).toBeNull();
  });

  it("copies the invitation link and confirms it for a moment", fakeAsync(() => {
    copyButton()!.click();
    fixture.detectChanges();

    expect(clipboard.copy).toHaveBeenCalledWith(environment.invitationUrl + "room-1");
    expect(copyButton()!.classList).toContain("btn-success");

    tick(1500);
    fixture.detectChanges();

    expect(copyButton()!.classList).toContain("btn-primary");
  }));

  describe("on a narrowing screen", () => {
    function showAt(width: number, roomName = "Sprint 42 planning"): void {
      store.setState(appState({room: room({id: "room-1", name: roomName})}));
      fixture.nativeElement.style.width = width + "px";
      fixture.componentInstance.fit();
    }

    function header(): HTMLElement {
      return fixture.nativeElement.querySelector("header");
    }

    function visible(selector: string): boolean {
      const element: HTMLElement | null = fixture.nativeElement.querySelector(selector);
      return !!element && element.offsetParent !== null;
    }

    it("shows everything when it fits", () => {
      showAt(1600);

      expect(fixture.componentInstance.compactness).toBe(0);
      expect(visible(".tagline")).toBeTrue();
      expect(visible(".support-link .button-label")).toBeTrue();
      expect(visible(".invitation-link .button-label")).toBeTrue();
    });

    it("gives up the parts in the agreed order and keeps one line of the same height", () => {
      showAt(1600);
      const height = header().offsetHeight;
      const taken: number[] = [];

      for (let width = 1600; width >= 320; width -= 10) {
        showAt(width);
        taken.push(fixture.componentInstance.compactness);
        expect(header().offsetHeight).withContext(width + "px").toBe(height);
        expect(header().scrollWidth).withContext(width + "px").toBeLessThanOrEqual(header().clientWidth);
      }

      expect(taken).toEqual([...taken].sort((a, b) => a - b));
      expect(taken[taken.length - 1]).toBe(COMPACT_STEPS.length);
    });

    it("hides the tagline first", () => {
      showAt(1600);
      while (fixture.componentInstance.compactness === 0) {
        showAt(fixture.nativeElement.offsetWidth - 10);
      }

      expect(fixture.componentInstance.compactSteps).toEqual(["without-tagline"]);
      expect(visible(".tagline")).toBeFalse();
      expect(visible(".wordmark")).toBeTrue();
    });

    it("lets a name of several words wrap, but not a single word", () => {
      showAt(1600, "Sprint planning");
      expect(fixture.componentInstance.roomNameWraps).toBeTrue();

      showAt(1600, "Planning");
      expect(fixture.componentInstance.roomNameWraps).toBeFalse();
    });

    it("leaves the logo, the room name, the invitation icon and a menu on a phone", () => {
      showAt(360);

      expect(visible("img[alt='PiPoker Logo']")).toBeTrue();
      expect(visible(".wordmark")).toBeFalse();
      expect(visible(".room-name")).toBeTrue();
      expect(visible(".invitation-link .add-user-icon")).toBeTrue();
      expect(visible(".invitation-link .button-label")).toBeFalse();
      expect(supportLink()).toBeNull();
      expect(fixture.nativeElement.querySelector(".language-select")).toBeNull();

      fixture.nativeElement.querySelector(".settings-dropdown [ngbDropdownToggle]").click();
      fixture.detectChanges();

      const menu: HTMLElement = fixture.nativeElement.querySelector(".settings-dropdown [ngbDropdownMenu]");
      expect(menu.querySelector<HTMLAnchorElement>("a.support-item")?.href).toBe(environment.supportUrl);
      expect(Array.from(menu.querySelectorAll("[lang]")).map(item => item.textContent!.trim()))
        .toEqual(["Русский", "English"]);
      expect(menu.querySelector(".theme-switcher")).not.toBeNull();
    });

    it("offers the guide in the menu outside a room", () => {
      store.setState({...appState(), roomState: roomState({room: room({id: "", name: ""})})});
      // Without a room name and the invitation button the menu comes only on a very narrow screen
      fixture.nativeElement.style.width = "240px";
      fixture.componentInstance.fit();

      expect(guideLink()).toBeNull();
      fixture.nativeElement.querySelector(".settings-dropdown [ngbDropdownToggle]").click();
      fixture.detectChanges();

      const item: HTMLAnchorElement = fixture.nativeElement.querySelector(".settings-dropdown a.guide-item");
      expect(item.getAttribute("href")).toBe("/guide");
      expect(item.textContent!.trim()).toBe("How to run Planning Poker");
    });

    it("opens the menu that a narrowing window brings", async () => {
      // Only Angular's zone updates the page here, as in the browser
      fixture.autoDetectChanges(true);
      store.setState(appState({room: room({id: "room-1", name: "Sprint 42 planning"})}));
      fixture.nativeElement.style.width = "360px";
      await new Promise(resolve => setTimeout(resolve, 50));

      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(".settings-dropdown [ngbDropdownToggle]");
      toggle.click();

      expect(fixture.nativeElement.querySelector(".settings-dropdown [ngbDropdownMenu]").classList).toContain("show");
    });

    it("fits again after the language changes, as the texts change width", () => {
      showAt(1600);
      spyOn(fixture.componentInstance, "fit");

      chooseLanguage("ru");

      expect(fixture.componentInstance.fit).toHaveBeenCalled();
    });
  });
});
