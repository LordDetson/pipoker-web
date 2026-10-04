import {Participant} from "./participant.model";
import {RoundDto, VoteDto} from "./room-dto.model";

export enum RoomEventType {
  participantAdded = "PARTICIPANT_ADDED",
  participantRemoved = "PARTICIPANT_REMOVED",
  participantReturned = "PARTICIPANT_RETURNED",
  voteAdded = "VOTE_ADDED",
  voteRemoved = "VOTE_REMOVED",
  clearVotes = "CLEAR_VOTES",
  showVotes = "SHOW_VOTES",
  // Nobody did anything in the room for long, so the server closed it and everyone left
  roomClosed = "ROOM_CLOSED",
  // Everyone left the room, so the server deleted it
  roomRemoved = "ROOM_REMOVED"
}

export interface RoomEvent {
  roomId: string,
  eventType: RoomEventType,
  participant?: Participant,
  vote?: VoteDto,
  // With showVotes: the round that entered the room's history, none when the cards were already revealed
  round?: RoundDto
}

export enum ErrorCode {
  roomNotFound = "ROOM_NOT_FOUND"
}

export interface ErrorEvent {
  destination: string,
  message: string,
  // Only the errors the page handles in its own way have a code
  code?: ErrorCode
}
