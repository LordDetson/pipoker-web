import {Deck} from "./deck.model";

export interface CreateRoomInfo {
  nickname: string;
  roomName: string;
  deck: Deck;
  watcher: boolean;
  // What the human check gave the page, see HumanCheckService
  humanCheckToken?: string;
}
