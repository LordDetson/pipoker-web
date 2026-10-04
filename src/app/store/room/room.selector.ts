import {createFeatureSelector, createSelector} from "@ngrx/store";
import {Participant} from "../../models/participant.model";
import {Card} from "../../models/card.model";
import {roomStateNode} from "../intex";
import {RoomState, RoomStatus} from "./room-state";
import {errorMessage} from "../../common/room-validators";
import {VotingResult} from "../../models/voting-result.model";
import {VoteDto} from "../../models/room-dto.model";

export const roomFeatureSelector = createFeatureSelector<RoomState>(roomStateNode);

export const statusSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): string => state.status);
export const idSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): string => state.room.id);
export const nameSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): string => state.room.name);
export const participantsSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): Participant[] => state.room.participants);
export const cardsSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): Card[] => state.room.deck.cards);
export const votingResultSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): VotingResult => state.room.votingResult);
export const showVotingResultSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): boolean => state.showVotingResult);
// Why the room can't be shown: closed while this page was in it, or missing when the page opened it
export const goneSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): RoomStatus.closed | RoomStatus.missing | undefined =>
    state.status === RoomStatus.closed || state.status === RoomStatus.missing ? state.status : undefined);
export const errorSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): string | undefined => state.status === RoomStatus.error ? errorMessage(state.error) : undefined);

// Revealed cards turn over one after another in the order of the deck: the lowest voted value at once, every next
// voted value one step later, equal votes together. Deck values nobody voted for add no wait, and with many different
// votes the step shrinks so that the last card starts turning no later than the limit.
const FLIP_STEP_SECONDS = 0.3;
const LAST_FLIP_DELAY_LIMIT_SECONDS = 1.5;

// The delay in seconds before the card of every participant who voted turns over, by nickname
export const flipDelaysSelector = createSelector(
  cardsSelector,
  votingResultSelector,
  (deck: Card[], votingResult: VotingResult): Map<string, number> => {
    const deckValues = deck.map(card => card.value);
    const votedValues = [...new Set([...votingResult.map.values()].map(card => card.value))]
      .sort((first, second) => deckValues.indexOf(first) - deckValues.indexOf(second));
    const step = Math.min(FLIP_STEP_SECONDS, LAST_FLIP_DELAY_LIMIT_SECONDS / Math.max(votedValues.length - 1, 1));
    return new Map([...votingResult.map].map(([nickname, card]) => [nickname, votedValues.indexOf(card.value) * step]));
  });

export interface Tally {
  card: string;
  count: number;
}

export interface HistoryRound {
  // Counted from 1 in the order the rounds were revealed
  number: number;
  revealedAt: string;
  // How many picked each card, in the order of the deck; cards that aren't in the deck anymore go last
  tally: Tally[];
  // The card most people picked, none when several cards share the most votes
  result?: string;
  votes: VoteDto[];
}

// The room's history, the latest round first
export const historySelector = createSelector(
  roomFeatureSelector,
  cardsSelector,
  (state: RoomState, deck: Card[]): HistoryRound[] => {
    const deckValues = deck.map(card => card.value);
    const order = (value: string) => deckValues.includes(value) ? deckValues.indexOf(value) : deckValues.length;
    return state.room.history.map((round, index) => {
      const counts = new Map<string, number>();
      round.votes.forEach(vote => counts.set(vote.card, (counts.get(vote.card) ?? 0) + 1));
      const tally = [...counts].map(([card, count]) => ({card, count}))
        .sort((first, second) => order(first.card) - order(second.card));
      const most = Math.max(...tally.map(entry => entry.count));
      const leaders = tally.filter(entry => entry.count === most);
      return {
        number: index + 1,
        revealedAt: round.revealedAt,
        tally,
        result: leaders.length === 1 ? leaders[0].card : undefined,
        votes: round.votes
      };
    }).reverse();
  });
