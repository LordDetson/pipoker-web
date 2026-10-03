import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CreateRoomComponent} from "./create-room/create-room.component";
import {RoomComponent} from "./room/room.component";

export const routes: Routes = [
  {path: "", component: CreateRoomComponent},
  {path: "room/:id", component: RoomComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
