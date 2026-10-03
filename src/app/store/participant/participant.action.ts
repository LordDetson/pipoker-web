import {createAction, props} from "@ngrx/store";
import {Participant} from "../../models/participant.model";
import {Vote} from "../../models/vote";
import {Card} from "../../models/card.model";

export enum ParticipantActionType {
  init = "[Participant] init",
  initSuccess = "[Participant] init success",
  initFailure = "[Participant] init failure",
  destroy = "[Participant] destroy",
  destroySuccess = "[Participant] destroy success",
  returnToSeat = "[Participant] return to seat",
  seatLost = "[Participant] seat lost",
  initSelectedCurdSuccess = "[Participant] init selected card success",
  initSelectedCurdFailure = "[Participant] init selected card failure",
  destroySelectedCurdSuccess = "[Participant] destroy selected card success",
  destroySelectedCurdFailure = "[Participant] destroy selected card failure",
  doNothing = "[Participant] do nothing",
}

export const init = createAction(ParticipantActionType.init);
export const initSuccess = createAction(ParticipantActionType.initSuccess,
  props<{ participant: Participant }>());
export const initFailure = createAction(ParticipantActionType.initFailure,
  props<{ error: any }>());
export const destroy = createAction(ParticipantActionType.destroy);
export const destroySuccess = createAction(ParticipantActionType.destroySuccess);
// The participant this tab had in the room before the page was reloaded
export const returnToSeat = createAction(ParticipantActionType.returnToSeat,
  props<{ roomId: string, participant: Participant }>());
// The participant is no longer in the room: the connection was gone for too long
export const seatLost = createAction(ParticipantActionType.seatLost,
  props<{ roomId: string, participant: Participant }>());
export const initSelectedCurdSuccess = createAction(ParticipantActionType.initSelectedCurdSuccess,
  props<{ card: Card }>());
export const initSelectedCurdFailure = createAction(ParticipantActionType.initSelectedCurdFailure,
  props<{ error: any }>());
export const destroySelectedCurdSuccess = createAction(ParticipantActionType.destroySelectedCurdSuccess);
export const destroySelectedCurdFailure = createAction(ParticipantActionType.destroySelectedCurdFailure,
  props<{ error: any }>());
export const doNothing = createAction(ParticipantActionType.doNothing);
