import {ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {filter, Observable, Subscription, take} from "rxjs";
import * as RoomSelector from "../../store/room/room.selector";
import {RoomService} from "../../services/room.service";
import {TaskDto} from "../../models/room-dto.model";

// The same limits pipoker-app checks for the task of a round
export const MAX_TASK_NAME_LENGTH = 200;
export const MAX_TASK_URL_LENGTH = 2000;
// Only web links, so the page never opens a link that runs a script
const WEB_LINK = /^https?:\/\/\S+$/i;

// What the round estimates, above the table. Anyone in the room names it or changes it while the cards are hidden.
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
  task$: Observable<TaskDto | undefined> = this.store.select(RoomSelector.taskSelector);
  revealed$: Observable<boolean> = this.store.select(RoomSelector.showVotingResultSelector);

  @ViewChild("nameInput")
  set nameInput(input: ElementRef<HTMLInputElement> | undefined) {
    // The field gets the cursor when the form opens
    input?.nativeElement.focus();
  }

  // The server trims the name and the link: the link is checked as it will be stored
  readonly form = new FormGroup({
    name: new FormControl("", {nonNullable: true, validators: Validators.maxLength(MAX_TASK_NAME_LENGTH)}),
    url: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_TASK_URL_LENGTH),
        control => !control.value.trim() || WEB_LINK.test(control.value.trim()) ? null : {webLink: true}]
    })
  });
  editing = false;
  saving = false;
  error?: unknown;

  private readonly subscriptions = new Subscription();

  constructor(
    private store: Store,
    private roomService: RoomService
  ) {
    // Revealed cards close the form: the task of the round can't change anymore
    this.subscriptions.add(this.revealed$.pipe(filter(revealed => revealed)).subscribe(() => this.cancel()));
  }

  edit(): void {
    this.task$.pipe(take(1)).subscribe(task => {
      this.form.setValue({name: task?.name ?? "", url: task?.url ?? ""});
      this.error = undefined;
      this.editing = true;
    });
  }

  cancel(): void {
    this.editing = false;
    this.saving = false;
  }

  // A blank name clears the task
  save(): void {
    if (this.form.invalid || this.saving) {
      return;
    }
    this.send(this.form.getRawValue());
  }

  remove(): void {
    this.send({name: ""});
  }

  private send(task: TaskDto): void {
    this.saving = true;
    this.error = undefined;
    this.store.select(RoomSelector.idSelector).pipe(take(1)).subscribe(roomId =>
      this.roomService.setTask(roomId, task).subscribe({
        next: () => this.cancel(),
        error: error => {
          this.saving = false;
          this.error = error;
        }
      }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
