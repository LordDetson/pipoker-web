import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector} from "@angular/core";
import {NgFor, NgIf} from "@angular/common";
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {NgbActiveModal, NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {combineLatest, firstValueFrom} from "rxjs";
import {select, Store} from "@ngrx/store";
import {revealedRoundSelector, roomFeatureSelector} from "../store/room/room.selector";
import {I18nService} from "../i18n/i18n.service";
import {TranslatePipe} from "../i18n/translate.pipe";
import {TranslationKey} from "../i18n/translations";
import {FeedbackKind, FeedbackResult, FeedbackService, describeBrowser, describeRoom} from "./feedback.service";

export const MESSAGE_MAX_LENGTH = 2000;
export const CONTACT_MAX_LENGTH = 200;

// A kind of feedback as the form shows it: the switch's label, and the question and hint over the message
interface FeedbackKindOption {
  kind: FeedbackKind;
  label: TranslationKey;
  message: TranslationKey;
  placeholder: TranslationKey;
}

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : {required: true};
}

// The feedback form: whether it is a problem, an idea or a review, the message and, if the person wants an answer,
// how to reach them. Standalone, so that it and the dialog code load with the first click rather than with the site
// (see openFeedback).
@Component({
  selector: "app-feedback",
  templateUrl: "./feedback.component.html",
  imports: [NgFor, NgIf, ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class FeedbackComponent {

  readonly messageMaxLength = MESSAGE_MAX_LENGTH;
  readonly contactMaxLength = CONTACT_MAX_LENGTH;
  readonly kinds: readonly FeedbackKindOption[] = [
    {kind: "problem", label: "feedback.problem", message: "feedback.problemMessage", placeholder: "feedback.problemPlaceholder"},
    {kind: "idea", label: "feedback.idea", message: "feedback.ideaMessage", placeholder: "feedback.ideaPlaceholder"},
    {kind: "review", label: "feedback.review", message: "feedback.reviewMessage", placeholder: "feedback.reviewPlaceholder"}
  ];
  readonly form = new FormGroup({
    kind: new FormControl<FeedbackKind>("problem", {nonNullable: true}),
    message: new FormControl("", {nonNullable: true, validators: [notBlank, Validators.maxLength(MESSAGE_MAX_LENGTH)]}),
    contact: new FormControl("", {nonNullable: true, validators: [Validators.maxLength(CONTACT_MAX_LENGTH)]})
  });
  // The message is asked for once the person tries to send, not when they leave the field to choose the kind
  triedToSend = false;
  sending = false;
  sent = false;
  error?: TranslationKey;

  private readonly errors: Record<Exclude<FeedbackResult, "sent">, TranslationKey> = {
    limited: "feedback.limited",
    failed: "feedback.failed"
  };

  constructor(
    public activeModal: NgbActiveModal,
    private feedback: FeedbackService,
    private store: Store,
    private i18n: I18nService,
    private changeDetector: ChangeDetectorRef
  ) {
  }

  // The question and the hint over the message follow the kind the person chose
  get chosenKind(): FeedbackKindOption {
    return this.kinds.find(option => option.kind === this.form.controls.kind.value)!;
  }

  async send(): Promise<void> {
    if (this.form.invalid || this.sending) {
      this.triedToSend = true;
      return;
    }
    this.sending = true;
    this.error = undefined;
    const [roomState, revealedRound] = await firstValueFrom(combineLatest([
      this.store.pipe(select(roomFeatureSelector)),
      this.store.pipe(select(revealedRoundSelector))
    ]));
    const {kind, message, contact} = this.form.getRawValue();
    const result = await this.feedback.send({
      kind,
      message: message.trim(),
      contact: contact.trim(),
      ...describeRoom(roomState, revealedRound),
      ...describeBrowser(this.i18n.language, new Date())
    });
    this.sending = false;
    if (result === "sent") {
      this.sent = true;
    } else {
      this.error = this.errors[result];
    }
    this.changeDetector.detectChanges();
  }
}

// The form opens over the page, which stays as it was
export function showFeedbackForm(injector: Injector): void {
  injector.get(NgbModal).open(FeedbackComponent, {centered: true, ariaLabelledBy: "feedbackTitle"});
}
