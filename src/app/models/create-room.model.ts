import {Deck} from "./deck.model";

export interface CreateRoomInfo {
  nickname: string;
  roomName: string;
  deck: Deck;
  watcher: boolean;
  // The cards are revealed by themselves once everyone has voted
  autoReveal: boolean;
}
