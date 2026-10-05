import {Deck} from "./deck.model";
import {Participant} from "./participant.model";
import {VotingResult} from "./voting-result.model";
import {RoundDto, TaskDto, TimerDto} from "./room-dto.model";

// The discussion timer as this page counts it down: endsAt is the moment by the clock of this computer
export interface RoomTimer {
  seconds: number;
  endsAt: number;
}

export interface Room {
  id: string;
  name: string;
  deck: Deck;
  participants: Participant[];
  votingResult: VotingResult;
  votesShown?: boolean;
  // The revealed rounds, oldest first
  history: RoundDto[];
  timer?: RoomTimer;
  // What the current round estimates
  task?: TaskDto;
  // The server reveals the cards by itself once every voter at the table has voted
  autoReveal?: boolean;
}

// The page counts down from the time left when it got the timer, as the clock of this computer may differ from the server's
export function toTimer(timer: TimerDto): RoomTimer {
  return {seconds: timer.seconds, endsAt: Date.now() + (timer.remainingMillis ?? 0)};
}
