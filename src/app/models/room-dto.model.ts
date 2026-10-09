import {Participant} from "./participant.model";
import {VisitDto} from "../services/visit.service";

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

// What a round estimates: the name or the key of a task, and a link to it
export interface TaskDto {
  name: string;
  // Left out when the task has no link
  url?: string;
}

// A revealed round as the server keeps it in the room's history
export interface RoundDto {
  // ISO 8601 time, like 2026-10-04T17:00:00.123Z. It also tells the round apart when its estimate is accepted.
  revealedAt: string;
  // Sorted by nickname
  votes: VoteDto[];
  // Left out when nobody named the task of the round
  task?: TaskDto;
  // The accepted card, left out until someone accepts one
  estimate?: string;
}

// The estimate accepted for the round whose cards are revealed
export interface EstimateDto {
  revealedAt: string;
  card: string;
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
  // What the current round estimates, left out when nobody has named it
  task?: TaskDto;
}

export interface RoomCreationDto {
  name: string;
  deck: DeckDto;
  participants: Participant[];
  // Where the creator came to the site from, for the activity dashboard; left out when no visit was reported
  source?: VisitDto;
}
