import {TestBed} from "@angular/core/testing";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {AppComponent} from "./app.component";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {TranslatePipe} from "./i18n/translate.pipe";
import {I18nService} from "./i18n/i18n.service";
import {FeedbackComponent} from "./feedback/feedback.component";

describe("AppComponent", () => {
  let modal: jasmine.SpyObj<NgbModal>;

  beforeEach(() => {
    modal = jasmine.createSpyObj<NgbModal>("NgbModal", ["open"]);
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [TranslatePipe],
      providers: [{provide: NgbModal, useValue: modal}],
      schemas: [NO_ERRORS_SCHEMA]
    });
    TestBed.inject(I18nService).language = "en";
  });

  it("renders the header above the routed page", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(Array.from(element.children).map(child => child.tagName.toLowerCase())).toEqual(["app-header", "router-outlet", "button"]);
  });

  it("keeps the feedback button in the corner of every page", async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector("button.feedback-button");

    expect(getComputedStyle(button).position).toBe("fixed");
    expect(button.textContent).toContain("Feedback");

    button.click();

    // The form's code is loaded on the first click
    for (let wait = 0; wait < 100 && !modal.open.calls.any(); wait++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    expect(modal.open).toHaveBeenCalledOnceWith(FeedbackComponent, jasmine.objectContaining({ariaLabelledBy: "feedbackTitle"}));
  });
});
