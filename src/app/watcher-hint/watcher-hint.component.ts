import {ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {NgbPopover} from "@ng-bootstrap/ng-bootstrap";

// The question mark next to "Join as watcher" that explains what a watcher is. A mouse opens it by hovering,
// the keyboard by focusing, and a phone, which has no hover, by a tap. A tap or a click anywhere else, leaving
// with the mouse or the focus, or Escape closes it.
//
// The popover's own autoClose is off: it takes a tap on the question mark itself for a tap outside, so on a phone
// the hint would close right after the tap that opened it.
@Component({
  selector: 'app-watcher-hint',
  templateUrl: './watcher-hint.component.html',
  styleUrls: ['./watcher-hint.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class WatcherHintComponent {

  @ViewChild(NgbPopover, {static: true}) hint!: NgbPopover;

  constructor(
    private host: ElementRef<HTMLElement>
  ) {
  }

  open(): void {
    this.hint.open();
  }

  close(): void {
    this.hint.close();
  }

  // The hint is put right after the question mark, inside this component, so a tap on the hint keeps it open
  @HostListener("document:pointerdown", ["$event"])
  closeOnPointerElsewhere(event: PointerEvent): void {
    if (this.hint.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
