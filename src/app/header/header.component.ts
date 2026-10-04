import {Component, OnInit} from '@angular/core';
import {select, Store} from "@ngrx/store";
import {Observable} from "rxjs";
import {idSelector, nameSelector} from "../store/room/room.selector";
import {Clipboard} from '@angular/cdk/clipboard';
import {environment} from "../../env/env";
import {I18nService} from "../i18n/i18n.service";
import {LANGUAGES, LanguageOption} from "../i18n/translations";

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
  languages: LanguageOption[] = LANGUAGES;

  constructor(
    private store: Store,
    private clipboard: Clipboard,
    public i18n: I18nService
  ) {
  }

  copyInvitationLink(roomId: string): void {
    this.clipboard.copy(environment.invitationUrl + roomId);
    this.copied = true;
    setTimeout(() => this.copied = false, 1500);
  }
}
