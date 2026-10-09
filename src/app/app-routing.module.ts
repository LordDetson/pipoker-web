import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CreateRoomComponent} from "./create-room/create-room.component";
import {RoomComponent} from "./room/room.component";

export const routes: Routes = [
  {path: "", component: CreateRoomComponent},
  {path: "room/:id", component: RoomComponent},
  // The guide is read, not used, so it loads only when opened
  {path: "guide", loadComponent: () => import("./guide/guide.component").then(m => m.GuideComponent)}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
