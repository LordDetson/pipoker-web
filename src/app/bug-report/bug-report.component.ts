import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector} from "@angular/core";
import {NgIf} from "@angular/common";
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {NgbActiveModal, NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {combineLatest, firstValueFrom} from "rxjs";
import {select, Store} from "@ngrx/store";
import {revealedRoundSelector, roomFeatureSelector} from "../store/room/room.selector";
import {I18nService} from "../i18n/i18n.service";
import {TranslatePipe} from "../i18n/translate.pipe";
import {TranslationKey} from "../i18n/translations";
import {BugReportResult, BugReportService, describeBrowser, describeRoom} from "./bug-report.service";

export const MESSAGE_MAX_LENGTH = 2000;
export const CONTACT_MAX_LENGTH = 200;

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : {required: true};
}

// The form of a bug report: what happened and, if the person wants an answer, how to reach them.
// Standalone, so that it and the dialog code load with the first report rather than with the site (see openBugReport).
@Component({
  selector: "app-bug-report",
  templateUrl: "./bug-report.component.html",
  imports: [NgIf, ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class BugReportComponent {

  readonly messageMaxLength = MESSAGE_MAX_LENGTH;
  readonly contactMaxLength = CONTACT_MAX_LENGTH;
  readonly form = new FormGroup({
    message: new FormControl("", {nonNullable: true, validators: [notBlank, Validators.maxLength(MESSAGE_MAX_LENGTH)]}),
    contact: new FormControl("", {nonNullable: true, validators: [Validators.maxLength(CONTACT_MAX_LENGTH)]})
  });
  sending = false;
  sent = false;
  error?: TranslationKey;

  private readonly errors: Record<Exclude<BugReportResult, "sent">, TranslationKey> = {
    limited: "bugReport.limited",
    failed: "bugReport.failed"
  };

  constructor(
    public activeModal: NgbActiveModal,
    private bugReports: BugReportService,
    private store: Store,
    private i18n: I18nService,
    private changeDetector: ChangeDetectorRef
  ) {
  }

  async send(): Promise<void> {
    if (this.form.invalid || this.sending) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending = true;
    this.error = undefined;
    const [roomState, revealedRound] = await firstValueFrom(combineLatest([
      this.store.pipe(select(roomFeatureSelector)),
      this.store.pipe(select(revealedRoundSelector))
    ]));
    const {message, contact} = this.form.getRawValue();
    const result = await this.bugReports.send({
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
export function showBugReportForm(injector: Injector): void {
  injector.get(NgbModal).open(BugReportComponent, {centered: true, ariaLabelledBy: "bugReportTitle"});
}
