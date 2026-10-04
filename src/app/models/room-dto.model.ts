import {Participant} from "./participant.model";

export interface DeckDto {
  cards: string[];
}

export interface VoteDto {
  nickname: string;
  card: string;
}

// The discussion timer: the page asks to start it for seconds, the server tells the time left as it sends it
export interface TimerDto {
  seconds: number;
  remainingMillis?: number;
}

export interface RoomDto {
  id: string;
  name: string;
  deck: DeckDto;
  participants?: Participant[];
  votes?: VoteDto[];
  // The cards of the current round are revealed
  votesShown?: boolean;
  // Left out when nobody has started the timer in this round
  timer?: TimerDto;
}

export interface RoomCreationDto {
  name: string;
  deck: DeckDto;
  participants: Participant[];
}
