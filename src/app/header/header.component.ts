import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {select, Store} from "@ngrx/store";
import {combineLatest, Subscription} from "rxjs";
import {idSelector, nameSelector} from "../store/room/room.selector";
import {Clipboard} from '@angular/cdk/clipboard';
import {environment} from "../../env/env";
import {I18nService} from "../i18n/i18n.service";
import {Language, LANGUAGES, LanguageOption} from "../i18n/translations";

// What the header gives up, in this order, while its content does not fit into one line of its fixed height.
// Each step is a class on the header that keeps the steps before it.
export const COMPACT_STEPS = [
  "without-tagline",
  "small-room-name",
  "language-flag-only",
  "support-heart-only",
  "invite-icon-only",
  "logo-only",
  "settings-menu"
] as const;

export type CompactStep = typeof COMPACT_STEPS[number];

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class HeaderComponent implements AfterViewInit, OnDestroy {

  @ViewChild("header") header: ElementRef<HTMLElement>;
  @ViewChild("roomNameElement") roomNameElement?: ElementRef<HTMLElement>;

  roomId: string;
  roomName: string;
  copied: boolean;
  supportUrl: string = environment.supportUrl;
  languages: LanguageOption[] = LANGUAGES;
  // How many of COMPACT_STEPS are taken
  compactness = 0;

  private readonly roomSubscription: Subscription;
  private resizeObserver: ResizeObserver;

  constructor(
    private store: Store,
    private clipboard: Clipboard,
    private changeDetector: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>,
    private ngZone: NgZone,
    public i18n: I18nService
  ) {
    this.roomSubscription = combineLatest([
      this.store.pipe(select(idSelector)),
      this.store.pipe(select(nameSelector))
    ]).subscribe(([roomId, roomName]) => {
      this.roomId = roomId;
      this.roomName = roomName;
      if (this.header) {
        this.fit();
      }
    });
  }

  ngAfterViewInit(): void {
    // The header's own size is fixed by CSS, so fitting its content never triggers the observer again.
    // The observer reports outside Angular's zone, where the buttons fit creates would not update the page on click.
    this.resizeObserver = new ResizeObserver(() => this.ngZone.run(() => this.fit()));
    this.resizeObserver.observe(this.host.nativeElement);
    // The texts change width once the Rubik font has loaded
    document.fonts.ready.then(() => this.ngZone.run(() => this.fit()));
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.roomSubscription.unsubscribe();
  }

  get compactSteps(): CompactStep[] {
    return COMPACT_STEPS.slice(0, this.compactness);
  }

  taken(step: CompactStep): boolean {
    return COMPACT_STEPS.indexOf(step) < this.compactness;
  }

  // A one-word name cannot wrap, so it stays on one line and is cut with an ellipsis if it is still too long
  get roomNameWraps(): boolean {
    return /\s/.test(this.roomName.trim());
  }

  chooseLanguage(language: Language): void {
    this.i18n.choose(language);
    this.fit();
  }

  copyInvitationLink(roomId: string): void {
    this.clipboard.copy(environment.invitationUrl + roomId);
    this.copied = true;
    setTimeout(() => this.copied = false, 1500);
  }

  // Takes the fewest steps with which everything fits. The widths depend on the room name and the language,
  // so they are measured rather than guessed from the screen width. All of it happens before the browser
  // paints, so the intermediate states are never seen.
  fit(): void {
    for (this.compactness = 0; this.compactness < COMPACT_STEPS.length; this.compactness++) {
      this.changeDetector.detectChanges();
      if (this.fits()) {
        return;
      }
    }
    this.changeDetector.detectChanges();
  }

  // Measured on the grid's columns rather than on the header's scroll width, which an open menu would widen
  private fits(): boolean {
    const header = getComputedStyle(this.header.nativeElement);
    const columns = header.gridTemplateColumns.split(" ").map(parseFloat);
    const usedWidth = columns.reduce((sum, width) => sum + width, 0) + parseFloat(header.columnGap) * (columns.length - 1);
    const availableWidth = parseFloat(header.width) - parseFloat(header.paddingLeft) - parseFloat(header.paddingRight);
    const roomName = this.roomNameElement?.nativeElement;
    return usedWidth <= availableWidth + 0.5
      && (!roomName || (roomName.scrollWidth <= roomName.clientWidth && roomName.scrollHeight <= roomName.clientHeight));
  }
}
