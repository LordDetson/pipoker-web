import {Participant} from "./participant.model";
import {RoundDto, TaskDto, TimerDto, VoteDto} from "./room-dto.model";

export enum RoomEventType {
  participantAdded = "PARTICIPANT_ADDED",
  participantRemoved = "PARTICIPANT_REMOVED",
  participantReturned = "PARTICIPANT_RETURNED",
  // Someone became a watcher or a voter. A voter who became a watcher before the reveal loses the vote,
  // which comes as voteRemoved right before this event.
  participantRoleChanged = "PARTICIPANT_ROLE_CHANGED",
  voteAdded = "VOTE_ADDED",
  voteRemoved = "VOTE_REMOVED",
  clearVotes = "CLEAR_VOTES",
  showVotes = "SHOW_VOTES",
  // Someone started the discussion timer, in place of the one that may be running
  timerStarted = "TIMER_STARTED",
  // Someone stopped the discussion timer, or took away the one that ran out
  timerStopped = "TIMER_STOPPED",
  // Someone named what the current round estimates, or cleared it
  taskChanged = "TASK_CHANGED",
  // Someone accepted the estimate of the revealed round, in place of the one accepted before
  estimateAccepted = "ESTIMATE_ACCEPTED",
  // Someone turned on or off revealing the cards by themselves once everyone has voted. Turned on when everyone has
  // voted already, it comes right before showVotes.
  autoRevealChanged = "AUTO_REVEAL_CHANGED",
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
  // With showVotes: the round that entered the room's history, none when the cards were already revealed.
  // With estimateAccepted: the round with its estimate.
  round?: RoundDto,
  timer?: TimerDto,
  // With taskChanged and clearVotes: the task of the current round, none when there is none
  task?: TaskDto,
  // With autoRevealChanged: whether the cards are revealed by themselves now
  autoReveal?: boolean
}

// Why the server refused a request, see ErrorCode in pipoker-app. The page shows its own text for each of them.
export enum ErrorCode {
  roomNotFound = "ROOM_NOT_FOUND",
  nicknameTaken = "NICKNAME_TAKEN",
  participantNotFound = "PARTICIPANT_NOT_FOUND",
  watcherCannotVote = "WATCHER_CANNOT_VOTE",
  cardNotInDeck = "CARD_NOT_IN_DECK",
  cardsRevealed = "CARDS_REVEALED",
  roundNotRevealed = "ROUND_NOT_REVEALED",
  invalidData = "INVALID_DATA",
  unexpected = "UNEXPECTED"
}

export interface ErrorEvent {
  destination: string,
  // In English, for developers
  message: string,
  code: ErrorCode
}
