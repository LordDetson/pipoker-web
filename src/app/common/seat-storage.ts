import {Participant} from "../models/participant.model";
import {AppConstants} from "./app-constants";

// Remembers who the person is in a room in this browser tab. After a page refresh or a lost connection
// they take their seat back: the server keeps it for a few seconds before the person leaves the room.
// sessionStorage belongs to the tab and survives a refresh, but not closing the tab.
export class SeatStorage {

  static save(roomId: string, participant: Participant) {
    sessionStorage.setItem(SeatStorage.key(roomId), JSON.stringify({nickname: participant.nickname, watcher: participant.watcher}));
  }

  static find(roomId: string): Participant | undefined {
    try {
      const seat = JSON.parse(sessionStorage.getItem(SeatStorage.key(roomId)) ?? "null");
      return typeof seat?.nickname === "string" ? {nickname: seat.nickname, watcher: seat.watcher === true} : undefined;
    } catch (error) {
      return undefined;
    }
  }

  static remove(roomId: string) {
    sessionStorage.removeItem(SeatStorage.key(roomId));
  }

  private static key(roomId: string): string {
    return AppConstants.seat + roomId;
  }
}
