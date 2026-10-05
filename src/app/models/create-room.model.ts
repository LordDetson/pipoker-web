import {Deck} from "./deck.model";

export interface CreateRoomInfo {
  nickname: string;
  roomName: string;
  deck: Deck;
  watcher: boolean;
}
