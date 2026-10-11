import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CreateRoomComponent} from "./create-room/create-room.component";
import {RoomComponent} from "./room/room.component";
import {languageFromAddress} from "./i18n/language-from-address.guard";

// The guide is read, not used, so it loads only when opened
const guide = () => import("./guide/guide.component").then(m => m.GuideComponent);

// The start page and the guide have an address without a language and one for each language (language-pages.ts)
export const routes: Routes = [
  {path: "", component: CreateRoomComponent, canActivate: [languageFromAddress]},
  {path: "ru", component: CreateRoomComponent, canActivate: [languageFromAddress], data: {language: "ru"}},
  {path: "en", component: CreateRoomComponent, canActivate: [languageFromAddress], data: {language: "en"}},
  {path: "room/:id", component: RoomComponent},
  {path: "guide", loadComponent: guide, canActivate: [languageFromAddress]},
  {path: "ru/guide", loadComponent: guide, canActivate: [languageFromAddress], data: {language: "ru"}},
  {path: "en/guide", loadComponent: guide, canActivate: [languageFromAddress], data: {language: "en"}}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
