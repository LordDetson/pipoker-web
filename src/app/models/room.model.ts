import {Deck} from "./deck.model";
import {Participant} from "./participant.model";
import {VotingResult} from "./voting-result.model";

export interface Room {
  id: string;
  name: string;
  deck: Deck;
  participants: Participant[];
  votingResult: VotingResult;
  votesShown?: boolean;
}
