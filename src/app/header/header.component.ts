import {Component, OnInit} from '@angular/core';
import {select, Store} from "@ngrx/store";
import {Observable} from "rxjs";
import {idSelector, nameSelector} from "../store/room/room.selector";
import {Clipboard} from '@angular/cdk/clipboard';
import {environment} from "../../env/env";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {

  roomId$: Observable<string> = this.store.pipe(select(idSelector));
  roomName$: Observable<string> = this.store.pipe(select(nameSelector));
  copied: boolean;
  supportUrl: string = environment.supportUrl;

  constructor(
    private store: Store,
    private clipboard: Clipboard
  ) {
  }

  copyInvitationLink(roomId: string): void {
    this.clipboard.copy(environment.invitationUrl + roomId);
    this.copied = true;
    setTimeout(() => this.copied = false, 1500);
  }
}
