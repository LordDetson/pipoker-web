import {createFeatureSelector, createSelector} from "@ngrx/store";
import {Participant} from "../../models/participant.model";
import {Card} from "../../models/card.model";
import {roomStateNode} from "../intex";
import {RoomState, RoomStatus} from "./room-state";
import {errorMessage} from "../../common/room-validators";
import {VotingResult} from "../../models/voting-result.model";

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
export const errorSelector = createSelector(
  roomFeatureSelector,
  (state: RoomState): string | undefined => state.status === RoomStatus.error ? errorMessage(state.error) : undefined);
