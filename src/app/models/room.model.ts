import {Deck} from "./deck.model";
import {Participant} from "./participant.model";
import {VotingResult} from "./voting-result.model";
import {RoundDto} from "./room-dto.model";

export interface Room {
  id: string;
  name: string;
  deck: Deck;
  participants: Participant[];
  votingResult: VotingResult;
  votesShown?: boolean;
  // The revealed rounds, oldest first
  history: RoundDto[];
}
