import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';
import {CreateRoomComponent} from './create-room/create-room.component';
import {HeaderComponent} from './header/header.component';
import {ThemeSwitcherComponent} from './header/theme-switcher/theme-switcher.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {RoomComponent} from './room/room.component';
import {AddParticipantComponent} from './room/add-participant/add-participant.component';
import {StoreModule} from "@ngrx/store";
import {metaReducers, reducers} from "./store/intex";
import {EffectsModule} from '@ngrx/effects';
import {RoomEffect} from "./store/room/room.effect";
import {ParticipantEffect} from "./store/participant/participant.effect";
import {ButtonsComponent} from './room/buttons/buttons.component';
import {TableComponent} from './room/table/table.component';
import {DeckComponent} from './room/deck/deck.component';
import {DeckCardComponent} from './room/deck/deck-card/deck-card.component';
import {TableCardComponent} from './room/table/table-card/table-card.component';
import {VotingResultComponent} from './room/voting-result/voting-result.component';
import {AboutComponent} from './about/about.component';
import {TimerComponent} from './room/timer/timer.component';
import {RoleSwitchComponent} from "./room/role-switch/role-switch.component";
import {TranslatePipe} from './i18n/translate.pipe';
import {ServerErrorPipe} from './i18n/server-error.pipe';
import {storeDevtools} from "../env/store-devtools";
import {HistoryComponent} from './room/history/history.component';
import {TaskComponent} from './room/task/task.component';
import {EstimateComponent} from './room/estimate/estimate.component';

@NgModule({
  declarations: [
    AppComponent,
    CreateRoomComponent,
    HeaderComponent,
    ThemeSwitcherComponent,
    RoomComponent,
    AddParticipantComponent,
    ButtonsComponent,
    TableComponent,
    DeckComponent,
    DeckCardComponent,
    TableCardComponent,
    VotingResultComponent,
    HistoryComponent,
    AboutComponent,
    TimerComponent,
    TaskComponent,
    EstimateComponent,
    RoleSwitchComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbDropdownModule,
    FormsModule,
    ReactiveFormsModule,
    StoreModule.forRoot(reducers, {
      metaReducers,
      runtimeChecks: {
        strictStateImmutability: true,
        strictActionImmutability: true
      }
    }),
    storeDevtools,
    EffectsModule.forRoot([RoomEffect, ParticipantEffect]),
    TranslatePipe,
    ServerErrorPipe
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
