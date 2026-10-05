import {Component, HostListener, ChangeDetectionStrategy} from '@angular/core';
import {firstValueFrom, Observable, take} from "rxjs";
import {Clipboard} from "@angular/cdk/clipboard";
import {select, Store} from "@ngrx/store";
import * as RoomSelector from "../../store/room/room.selector";
import {HistoryRound} from "../../store/room/room.selector";
import {I18nService} from "../../i18n/i18n.service";
import {TranslationKey} from "../../i18n/translations";
import {historyText} from "./history-text";
// Only the type: the code itself is loaded on the first download
import type {ExportFormat} from "./history-export";

// The rounds revealed in the room: a button in the corner of the room opens them in a panel over the table
@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class HistoryComponent {

  rounds$: Observable<HistoryRound[]> = this.store.pipe(select(RoomSelector.historySelector));
  open = false;
  // For a moment after the summary is copied, its button says so
  summaryCopied = false;
  readonly formats: { format: ExportFormat; label: TranslationKey }[] = [
    {format: "xlsx", label: "history.export.xlsx"},
    {format: "csv", label: "history.export.csv"},
    {format: "txt", label: "history.export.txt"},
    {format: "xml", label: "history.export.xml"}
  ];

  constructor(
    private store: Store,
    private i18n: I18nService,
    private clipboard: Clipboard
  ) {
  }

  toggle(): void {
    this.open = !this.open;
  }

  @HostListener("document:keydown.escape")
  close(): void {
    this.open = false;
  }

  // Hours and minutes in the browser's time zone. Angular's date pipe would add its formatting code to the build.
  timeOf(round: HistoryRound): string {
    return new Date(round.revealedAt).toLocaleTimeString(this.i18n.language, {hour: "2-digit", minute: "2-digit"});
  }

  // The rounds go into the file oldest first. The file code is loaded with the first download, not with the site.
  async download(format: ExportFormat, rounds: HistoryRound[]): Promise<void> {
    const [{exportHistory, saveFile}, roomName] = await Promise.all([
      import("./history-export"),
      firstValueFrom(this.store.pipe(select(RoomSelector.nameSelector)))
    ]);
    saveFile(exportHistory(format, roomName, [...rounds].reverse(), this.i18n, new Date()));
  }

  // Copies right at the click: Safari lets a page write to the clipboard only while it handles the click
  copySummary(rounds: HistoryRound[]): void {
    this.store.pipe(select(RoomSelector.nameSelector), take(1)).subscribe(roomName => {
      this.clipboard.copy(historyText(roomName, [...rounds].reverse(), this.i18n, new Date(), "\n"));
      this.summaryCopied = true;
      setTimeout(() => this.summaryCopied = false, 1500);
    });
  }

  numberOf(index: number, round: HistoryRound): number {
    return round.number;
  }
}
