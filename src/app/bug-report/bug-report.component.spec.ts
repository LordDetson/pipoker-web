import {ComponentFixture, TestBed} from "@angular/core/testing";
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {BugReportComponent} from "./bug-report.component";
import {BugReportService} from "./bug-report.service";
import {appState, room} from "../testing/test-data";
import {I18nService} from "../i18n/i18n.service";

describe("BugReportComponent", () => {
  let fixture: ComponentFixture<BugReportComponent>;
  let bugReports: jasmine.SpyObj<BugReportService>;
  let activeModal: jasmine.SpyObj<NgbActiveModal>;

  beforeEach(() => {
    bugReports = jasmine.createSpyObj<BugReportService>("BugReportService", ["send"]);
    activeModal = jasmine.createSpyObj<NgbActiveModal>("NgbActiveModal", ["close", "dismiss"]);
    TestBed.configureTestingModule({
      imports: [BugReportComponent],
      providers: [
        provideMockStore({initialState: appState({room: room({id: "room-1"})})}),
        {provide: BugReportService, useValue: bugReports},
        {provide: NgbActiveModal, useValue: activeModal}
      ]
    });
    TestBed.inject(I18nService).language = "en";
    fixture = TestBed.createComponent(BugReportComponent);
    fixture.detectChanges();
  });

  function element<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector);
  }

  function type(selector: string, value: string): void {
    const input = element<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event("input"));
  }

  async function submit(): Promise<void> {
    element<HTMLButtonElement>("button[type=submit]").click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it("asks what happened before sending", async () => {
    type("#bugReportMessage", "   ");
    await submit();

    expect(bugReports.send).not.toHaveBeenCalled();
    expect(element("#bugReportMessage").classList).toContain("is-invalid");
    expect(element(".invalid-feedback").textContent).toContain("Describe what happened");
  });

  it("sends what the person wrote with the room and the browser, then thanks them", async () => {
    bugReports.send.and.resolveTo("sent");
    type("#bugReportMessage", "  The cards don't turn over ");
    type("#bugReportContact", " @alex ");
    await submit();

    expect(bugReports.send).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      message: "The cards don't turn over",
      contact: "@alex",
      roomId: "room-1",
      language: "en",
      page: location.href
    }));
    expect(fixture.nativeElement.textContent).toContain("Thank you, the message has been sent.");
    expect(element("form")).toBeNull();

    element<HTMLButtonElement>(".modal-footer .btn-primary").click();
    expect(activeModal.close).toHaveBeenCalled();
  });

  it("leaves the room out outside a room", async () => {
    TestBed.inject(MockStore).setState(appState({room: room({id: ""})}));
    bugReports.send.and.resolveTo("sent");
    type("#bugReportMessage", "The page is blank");
    await submit();

    expect(bugReports.send.calls.mostRecent().args[0].roomId).toBeUndefined();
  });

  it("says when the browser sent too many reports and keeps the text", async () => {
    bugReports.send.and.resolveTo("limited");
    type("#bugReportMessage", "Broken");
    await submit();

    expect(element(".alert-danger").textContent).toContain("Try again in an hour");
    expect(element<HTMLTextAreaElement>("#bugReportMessage").value).toBe("Broken");
  });

  it("says when the report wasn't sent", async () => {
    bugReports.send.and.resolveTo("failed");
    type("#bugReportMessage", "Broken");
    await submit();

    expect(element(".alert-danger").textContent).toContain("The message wasn't sent");
  });

  it("closes without sending on Cancel", () => {
    element<HTMLButtonElement>(".modal-footer .btn-outline-secondary").click();

    expect(activeModal.dismiss).toHaveBeenCalled();
    expect(bugReports.send).not.toHaveBeenCalled();
  });
});
