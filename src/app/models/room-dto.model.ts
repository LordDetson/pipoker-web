import {Participant} from "./participant.model";

export interface DeckDto {
  cards: string[];
}

export interface VoteDto {
  nickname: string;
  card: string;
}

export interface RoomDto {
  id: string;
  name: string;
  deck: DeckDto;
  participants?: Participant[];
  votes?: VoteDto[];
}

export interface RoomCreationDto {
  name: string;
  deck: DeckDto;
  participants: Participant[];
}
