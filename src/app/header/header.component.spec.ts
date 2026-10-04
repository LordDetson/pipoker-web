import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {Clipboard} from "@angular/cdk/clipboard";
import {HeaderComponent} from "./header.component";
import {appState, room, roomState} from "../testing/test-data";
import {environment} from "../../env/env";
import {AppConstants} from "../common/app-constants";
import {NgbDropdownModule} from "@ng-bootstrap/ng-bootstrap";
import {TranslatePipe} from "../i18n/translate.pipe";

describe("HeaderComponent", () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;
  let clipboard: jasmine.SpyObj<Clipboard>;

  beforeEach(() => {
    localStorage.removeItem(AppConstants.language);
    clipboard = jasmine.createSpyObj<Clipboard>("Clipboard", ["copy"]);
    TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      imports: [TranslatePipe, NgbDropdownModule],
      providers: [
        provideMockStore({initialState: appState({room: room({id: "room-1", name: "Planning"})})}),
        {provide: Clipboard, useValue: clipboard}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  function copyButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector("button.invitation-link");
  }

  it("shows the room name and the invitation button inside a room", () => {
    expect(fixture.nativeElement.textContent).toContain("Planning");
    expect(copyButton()?.textContent).toContain("Copy Invitation Link");
  });

  it("shows neither outside a room", () => {
    store.setState({...appState(), roomState: roomState({room: room({id: "", name: ""})})});
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector("strong.text-center")).toBeNull();
    expect(copyButton()).toBeNull();
  });

  afterEach(() => localStorage.removeItem(AppConstants.language));

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
    expect(copyButton()?.textContent).toContain("Скопировать приглашение");
    expect(supportLink()?.textContent?.trim()).toMatch(/^♥\s+Поддержать$/);
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
    expect(supportLink()?.textContent?.trim()).toMatch(/^♥\s+Support$/);
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
});
