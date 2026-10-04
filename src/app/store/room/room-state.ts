import {Room} from "../../models/room.model";

export interface RoomState {
  room: Room;
  showVotingResult: boolean;
  error: any;
  status: RoomStatus;
}

export enum RoomStatus {
  pending = "pending",
  loading = "loading",
  success = "success",
  error = "error",
  // The server closed the room while this page was in it, because nobody did anything there for long
  closed = "closed",
  // The room doesn't exist: everyone has left it, or it was closed
  missing = "missing"
}
