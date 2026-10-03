import {Participant} from "./participant.model";
import {VoteDto} from "./room-dto.model";

export enum RoomEventType {
  participantAdded = "PARTICIPANT_ADDED",
  participantRemoved = "PARTICIPANT_REMOVED",
  participantReturned = "PARTICIPANT_RETURNED",
  voteAdded = "VOTE_ADDED",
  voteRemoved = "VOTE_REMOVED",
  clearVotes = "CLEAR_VOTES",
  showVotes = "SHOW_VOTES"
}

export interface RoomEvent {
  roomId: string,
  eventType: RoomEventType,
  participant?: Participant,
  vote?: VoteDto
}

export interface ErrorEvent {
  destination: string,
  message: string
}
