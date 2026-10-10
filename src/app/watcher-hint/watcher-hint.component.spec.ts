import {ComponentFixture, TestBed} from "@angular/core/testing";
import {NgbConfig, NgbPopoverModule} from "@ng-bootstrap/ng-bootstrap";
import {WatcherHintComponent} from "./watcher-hint.component";
import {TranslatePipe} from "../i18n/translate.pipe";
import {I18nService} from "../i18n/i18n.service";

describe("WatcherHintComponent", () => {
  let fixture: ComponentFixture<WatcherHintComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WatcherHintComponent],
      imports: [NgbPopoverModule, TranslatePipe]
    });
    TestBed.inject(I18nService).language = "en";
    // Without the fade the hint is gone as soon as it closes
    TestBed.inject(NgbConfig).animation = false;
    fixture = TestBed.createComponent(WatcherHintComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector("button");
  }

  function hint(): HTMLElement | null {
    return document.querySelector(".watcher-hint-popover");
  }

  function fire(type: string): void {
    button().dispatchEvent(new Event(type));
    fixture.detectChanges();
  }

  it("is a button with a name, so the keyboard and a screen reader find it", () => {
    expect(button().type).toBe("button");
    expect(button().getAttribute("aria-label")).toBe("Who is a watcher");
    expect(hint()).toBeNull();
  });

  it("explains on hover that a watcher uses the room like a voter but does not vote", () => {
    fire("mouseenter");

    expect(hint()!.textContent).toContain("can do all that a voter does");
    expect(hint()!.textContent).toContain("The only thing a watcher can't do is vote");
    expect(button().getAttribute("aria-describedby")).toBe(hint()!.id);

    fire("mouseleave");

    expect(hint()).toBeNull();
  });

  it("opens on focus from the keyboard and closes on Escape", () => {
    fire("focus");
    expect(hint()).not.toBeNull();

    button().dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
    fixture.detectChanges();

    expect(hint()).toBeNull();
  });

  it("opens on a tap, as a phone has no hover, stays open on another tap on it or on the hint, "
    + "and closes on a tap elsewhere", () => {
    fire("click");
    expect(hint()).not.toBeNull();

    button().dispatchEvent(new PointerEvent("pointerdown", {bubbles: true}));
    fire("click");
    hint()!.dispatchEvent(new PointerEvent("pointerdown", {bubbles: true}));
    fixture.detectChanges();
    expect(hint()).not.toBeNull();

    document.body.dispatchEvent(new PointerEvent("pointerdown", {bubbles: true}));
    fixture.detectChanges();
    expect(hint()).toBeNull();
  });

  it("speaks the language of the page", () => {
    TestBed.inject(I18nService).language = "ru";
    fixture.detectChanges();
    fire("mouseenter");

    expect(button().getAttribute("aria-label")).toBe("Кто такой наблюдатель");
    expect(hint()!.textContent).toContain("Он только не голосует");
  });
});
