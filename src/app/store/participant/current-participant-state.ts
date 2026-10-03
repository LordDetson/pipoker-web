import {Participant} from "../../models/participant.model";
import {Card} from "../../models/card.model";

export interface CurrentParticipantState {
  currentParticipant: Participant | undefined;
  selectedCard: Card | undefined;
  error: any;
  status: CurrentParticipantStatus;
}

export enum CurrentParticipantStatus {
  pending = "pending",
  loading = "loading",
  // Taking the seat back after the page was reloaded
  returning = "returning",
  success = "success",
  error = "error"
}
