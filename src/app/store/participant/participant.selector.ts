import {createFeatureSelector, createSelector} from "@ngrx/store";
import {CurrentParticipantState} from "./current-participant-state";
import {currentParticipantStateNode} from "../intex";
import {Participant} from "../../models/participant.model";
import {Card} from "../../models/card.model";

export const currentParticipantFeatureSelector = createFeatureSelector<CurrentParticipantState>(currentParticipantStateNode);

export const currentParticipantSelector = createSelector(
  currentParticipantFeatureSelector,
  (state: CurrentParticipantState): Participant => state.currentParticipant!
);
export const statusSelector = createSelector(
  currentParticipantFeatureSelector,
  (state: CurrentParticipantState): string => state.status
);
export const selectedCardSelector = createSelector(
  currentParticipantFeatureSelector,
  (state: CurrentParticipantState): Card | undefined => state.selectedCard
);
// Until the participant has joined (or after they left) they cannot vote, so they are treated as a watcher.
export const currentWatcherSelector = createSelector(
  currentParticipantFeatureSelector,
  (state: CurrentParticipantState): boolean => state.currentParticipant?.watcher ?? true
);
export const joinedSelector = createSelector(
  currentParticipantFeatureSelector,
  (state: CurrentParticipantState): boolean => state.currentParticipant !== undefined
);
