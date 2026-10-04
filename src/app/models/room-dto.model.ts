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

// A revealed round as the server keeps it in the room's history
export interface RoundDto {
  // ISO 8601 time, like 2026-10-04T17:00:00.123Z
  revealedAt: string;
  // Sorted by nickname
  votes: VoteDto[];
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
  // The revealed rounds, oldest first
  history?: RoundDto[];
}

export interface RoomCreationDto {
  name: string;
  deck: DeckDto;
  participants: Participant[];
}
