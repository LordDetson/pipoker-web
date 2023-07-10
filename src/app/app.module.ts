import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CreateRoomComponent } from './create-room/create-room.component';
import { HeaderComponent } from './header/header.component';
import { ThemeSwitcherComponent } from './theme-switcher/theme-switcher.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import { RoomComponent } from './room/room.component';

@NgModule({
  declarations: [
    AppComponent,
    CreateRoomComponent,
    HeaderComponent,
    ThemeSwitcherComponent,
    RoomComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }