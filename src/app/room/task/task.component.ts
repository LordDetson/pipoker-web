import {ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {debounceTime, Subscription, take} from "rxjs";
import * as RoomSelector from "../../store/room/room.selector";
import {RoomService} from "../../services/room.service";
import {TaskDto} from "../../models/room-dto.model";

// The same limits pipoker-app checks for the task of a round
export const MAX_TASK_NAME_LENGTH = 200;
export const MAX_TASK_URL_LENGTH = 2000;
// How long the fields wait after the last key before they send the task
export const TASK_SAVE_DELAY_MS = 1000;
// Only web links, so the page never opens a link that runs a script
const WEB_LINK = /^https?:\/\/\S+$/i;

type TaskField = "name" | "url";

// The task the round estimates, above the table: its name in the middle and, behind the icon beside it, a link to
// it. Anyone in the room changes them while the cards are hidden: the task is sent when the person stops typing,
// presses Enter or leaves the field.
@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class TaskComponent implements OnDestroy {

  readonly maxNameLength = MAX_TASK_NAME_LENGTH;
  readonly maxUrlLength = MAX_TASK_URL_LENGTH;
  readonly form = new FormGroup({
    name: new FormControl("", {nonNullable: true, validators: Validators.maxLength(MAX_TASK_NAME_LENGTH)}),
    url: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_TASK_URL_LENGTH),
        control => !control.value.trim() || WEB_LINK.test(control.value.trim()) ? null : {webLink: true}]
    })
  });
  // The field being changed, none when the cursor is elsewhere
  focused?: TaskField;
  // The field of the link shows under its icon only while someone changes the link
  linkOpen = false;
  error?: unknown;

  // The task the room has, as the server trims it
  private known: Required<TaskDto> = {name: "", url: ""};
  // The task sent and not yet heard back, so the same task is not sent twice
  private sending?: string;
  private readonly subscriptions = new Subscription();

  constructor(
    private store: Store,
    private roomService: RoomService
  ) {
    this.subscriptions.add(this.store.select(RoomSelector.taskSelector).subscribe(task => {
      const known = {name: task?.name ?? "", url: task?.url ?? ""};
      // Someone else's change replaces a field only while this person isn't changing it
      for (const field of ["name", "url"] as TaskField[]) {
        const control = this.form.controls[field];
        if (this.focused !== field || control.value.trim() === this.known[field]) {
          control.setValue(known[field], {emitEvent: false});
        }
      }
      this.known = known;
    }));
    // Revealed cards close the fields: the task of the round can't change anymore
    this.subscriptions.add(this.store.select(RoomSelector.showVotingResultSelector).subscribe(revealed => {
      if (revealed) {
        this.form.setValue(this.known, {emitEvent: false});
        this.form.disable({emitEvent: false});
      } else {
        this.form.enable({emitEvent: false});
      }
    }));
    this.subscriptions.add(this.form.valueChanges.pipe(debounceTime(TASK_SAVE_DELAY_MS)).subscribe(() => this.save()));
  }

  @ViewChild("url")
  set urlInput(input: ElementRef<HTMLInputElement> | undefined) {
    // The field of the link gets the cursor when it opens, so a link can be pasted at once
    input?.nativeElement.focus();
  }

  get link(): string | undefined {
    return this.known.url || undefined;
  }

  // The icons to the right of the name: the link to change and the task to open
  get icons(): number {
    return (this.form.disabled ? 0 : 1) + (this.link ? 1 : 0);
  }

  openLink(): void {
    this.linkOpen = true;
  }

  leave(): void {
    // A link that can't be sent stays open with its error
    if (this.focused === "url" && this.form.controls.url.valid) {
      this.linkOpen = false;
    }
    this.focused = undefined;
    this.save();
  }

  // Escape brings back what the room has in the field
  revert(field: TaskField): void {
    this.form.controls[field].setValue(this.known[field], {emitEvent: false});
  }

  clear(field: TaskField): void {
    this.form.controls[field].setValue("", {emitEvent: false});
    this.save();
  }

  // A blank name clears the task. A link waits for its name, otherwise the server would drop it.
  save(): void {
    const task = {name: this.form.controls.name.value.trim(), url: this.form.controls.url.value.trim()};
    const key = JSON.stringify(task);
    if (this.form.disabled || this.form.invalid || (!task.name && task.url)
      || key === JSON.stringify(this.known) || key === this.sending) {
      return;
    }
    this.sending = key;
    this.error = undefined;
    this.store.select(RoomSelector.idSelector).pipe(take(1)).subscribe(roomId =>
      this.roomService.setTask(roomId, task).subscribe({
        next: () => this.sending = undefined,
        error: error => {
          this.sending = undefined;
          this.error = error;
        }
      }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
