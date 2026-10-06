import {ComponentFixture, TestBed} from "@angular/core/testing";
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";
import {MockStore, provideMockStore} from "@ngrx/store/testing";
import {FeedbackComponent} from "./feedback.component";
import {FeedbackService} from "./feedback.service";
import {appState, participant, room, votes} from "../testing/test-data";
import {I18nService} from "../i18n/i18n.service";

describe("FeedbackComponent", () => {
  let fixture: ComponentFixture<FeedbackComponent>;
  let feedback: jasmine.SpyObj<FeedbackService>;
  let activeModal: jasmine.SpyObj<NgbActiveModal>;

  beforeEach(() => {
    feedback = jasmine.createSpyObj<FeedbackService>("FeedbackService", ["send"]);
    activeModal = jasmine.createSpyObj<NgbActiveModal>("NgbActiveModal", ["close", "dismiss"]);
    TestBed.configureTestingModule({
      imports: [FeedbackComponent],
      providers: [
        provideMockStore({initialState: appState({room: room({
          id: "room-1",
          participants: [participant("Dmitry"), participant("Alex"), participant("Kate", true)],
          votingResult: {map: votes({Alex: "1h"})}
        })})}),
        {provide: FeedbackService, useValue: feedback},
        {provide: NgbActiveModal, useValue: activeModal}
      ]
    });
    TestBed.inject(I18nService).language = "en";
    fixture = TestBed.createComponent(FeedbackComponent);
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

  it("asks for a message before sending", async () => {
    type("#feedbackMessage", "   ");
    await submit();

    expect(feedback.send).not.toHaveBeenCalled();
    expect(element("#feedbackMessage").classList).toContain("is-invalid");
    expect(element(".invalid-feedback").textContent).toContain("Write a message");
  });

  it("sends what the person wrote with the room and the browser, then thanks them", async () => {
    feedback.send.and.resolveTo("sent");
    type("#feedbackMessage", "  The cards don't turn over ");
    type("#feedbackContact", " @alex ");
    await submit();

    expect(feedback.send).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      kind: "problem",
      message: "The cards don't turn over",
      contact: "@alex",
      roomId: "room-1",
      voters: 2,
      watchers: 1,
      voted: 1,
      round: "voting",
      language: "en",
      page: location.href
    }));
    expect(fixture.nativeElement.textContent).toContain("Thank you, the message has been sent.");
    expect(element("form")).toBeNull();

    element<HTMLButtonElement>(".modal-footer .btn-primary").click();
    expect(activeModal.close).toHaveBeenCalled();
  });

  it("doesn't scold an empty message when the person only chooses the kind", () => {
    element<HTMLTextAreaElement>("#feedbackMessage").dispatchEvent(new Event("blur"));
    element<HTMLInputElement>("#feedbackKind-review").click();
    fixture.detectChanges();

    expect(element("#feedbackMessage").classList).not.toContain("is-invalid");
  });

  it("sends an idea when the person chooses it, with its own question", async () => {
    feedback.send.and.resolveTo("sent");
    expect(element("label[for=feedbackMessage]").textContent).toContain("What happened?");

    element<HTMLInputElement>("#feedbackKind-idea").click();
    fixture.detectChanges();
    expect(element("label[for=feedbackMessage]").textContent).toContain("What would you add or change?");
    expect(element<HTMLTextAreaElement>("#feedbackMessage").placeholder).toBe("What PiPoker lacks for your team");

    type("#feedbackMessage", "Show the average of the votes");
    await submit();

    expect(feedback.send.calls.mostRecent().args[0].kind).toBe("idea");
  });

  it("leaves the room out outside a room", async () => {
    TestBed.inject(MockStore).setState(appState({room: room({id: ""})}));
    feedback.send.and.resolveTo("sent");
    type("#feedbackMessage", "The page is blank");
    await submit();

    expect(feedback.send.calls.mostRecent().args[0].roomId).toBeUndefined();
  });

  it("says when the browser sent too many messages and keeps the text", async () => {
    feedback.send.and.resolveTo("limited");
    type("#feedbackMessage", "Broken");
    await submit();

    expect(element(".alert-danger").textContent).toContain("Try again in an hour");
    expect(element<HTMLTextAreaElement>("#feedbackMessage").value).toBe("Broken");
  });

  it("says when the message wasn't sent", async () => {
    feedback.send.and.resolveTo("failed");
    type("#feedbackMessage", "Broken");
    await submit();

    expect(element(".alert-danger").textContent).toContain("The message wasn't sent");
  });

  it("closes without sending on Cancel", () => {
    element<HTMLButtonElement>(".modal-footer .btn-outline-secondary").click();

    expect(activeModal.dismiss).toHaveBeenCalled();
    expect(feedback.send).not.toHaveBeenCalled();
  });
});
