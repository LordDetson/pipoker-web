import {createAction, props} from "@ngrx/store";
import {Room, RoomTimer} from "../../models/room.model";
import {Participant} from "../../models/participant.model";
import {CreateRoomInfo} from "../../models/create-room.model";
import {Card} from "../../models/card.model";
import {Vote} from "../../models/vote";
import {RoundDto, TaskDto} from "../../models/room-dto.model";

export enum RoomActionType {
  create = "[Room] create",
  get = "[Room] get",
  initSuccess = "[Room] init success",
  refreshSuccess = "[Room] refresh success",
  initFailure = "[Room] init failure",
  addParticipant = "[Room] add participant",
  addParticipantSuccess = "[Room] add participant success",
  addParticipantFailure = "[Room] add participant failure",
  removeParticipant = "[Room] remove participant",
  removeParticipantSuccess = "[Room] remove participant success",
  removeParticipantFailure = "[Room] remove participant failure",
  changeRole = "[Room] change role",
  roleChanged = "[Room] role changed",
  changeRoleFailure = "[Room] change role failure",
  selectCard = "[Room] select card",
  cardSelectionSuccess = "[Room] card selection success",
  cardSelectionFailure = "[Room] card selection failure",
  voteRemoved = "[Room] vote removed",
  showVotingResult = "[Room] show voting result",
  showVotingResultSuccess = "[Room] show voting result success",
  startNewVoting = "[Room] start new voting",
  startNewVotingSuccess = "[Room] start new voting success",
  startNewVotingFailure = "[Room] start new voting failure",
  startTimer = "[Room] start timer",
  timerStarted = "[Room] timer started",
  stopTimer = "[Room] stop timer",
  timerStopped = "[Room] timer stopped",
  taskChanged = "[Room] task changed",
  acceptEstimate = "[Room] accept estimate",
  estimateAccepted = "[Room] estimate accepted",
  setAutoReveal = "[Room] set auto reveal",
  autoRevealChanged = "[Room] auto reveal changed",
  closed = "[Room] closed",
  removed = "[Room] removed",
  doNothing = "[Room] do nothing",
}

export const create = createAction(RoomActionType.create,
  props<{ createRoomInfo: CreateRoomInfo }>());
export const get = createAction(RoomActionType.get,
  props<{ roomId: string }>());
export const initSuccess = createAction(RoomActionType.initSuccess,
  props<{ room: Room }>());
// The room as the server has it now, loaded again after the connection came back
export const refreshSuccess = createAction(RoomActionType.refreshSuccess,
  props<{ room: Room }>());
export const initFailure = createAction(RoomActionType.initFailure,
  props<{ error: any }>());
export const addParticipant = createAction(RoomActionType.addParticipant,
  props<{ roomId: string, participant: Participant }>());
export const addParticipantSuccess = createAction(RoomActionType.addParticipantSuccess,
  props<{ participant: Participant }>());
export const addParticipantFailure = createAction(RoomActionType.addParticipantFailure,
  props<{ error: any }>());
export const removeParticipant = createAction(RoomActionType.removeParticipant,
  props<{ roomId: string, participant: Participant }>());
export const removeParticipantSuccess = createAction(RoomActionType.removeParticipantSuccess,
  props<{ participant: Participant }>());
export const removeParticipantFailure = createAction(RoomActionType.removeParticipantFailure,
  props<{ error: any }>());
// The person looking at the page becomes a watcher or a voter
export const changeRole = createAction(RoomActionType.changeRole,
  props<{ watcher: boolean }>());
// Someone in the room became a watcher or a voter, maybe the person looking at the page
export const roleChanged = createAction(RoomActionType.roleChanged,
  props<{ participant: Participant }>());
export const changeRoleFailure = createAction(RoomActionType.changeRoleFailure,
  props<{ error: any }>());
export const selectCard = createAction(RoomActionType.selectCard,
  props<{ participant: Participant, card: Card }>());
export const cardSelectionSuccess = createAction(RoomActionType.cardSelectionSuccess,
  props<{ participant: Participant, card: Card }>());
export const cardSelectionFailure = createAction(RoomActionType.cardSelectionFailure,
  props<{ error: any }>());
// Someone has no vote in this round anymore, for example because they became a watcher before the reveal
export const voteRemoved = createAction(RoomActionType.voteRemoved,
  props<{ nickname: string }>());
export const showVotingResult = createAction(RoomActionType.showVotingResult);
// The cards are revealed. The first reveal of a round with votes brings the round that entered the room's history.
export const showVotingResultSuccess = createAction(RoomActionType.showVotingResultSuccess,
  props<{ round?: RoundDto }>());
export const startNewVoting = createAction(RoomActionType.startNewVoting);
// A new round starts, with the task the server kept for it: the same one when the team votes on it again
export const startNewVotingSuccess = createAction(RoomActionType.startNewVotingSuccess,
  props<{ task?: TaskDto }>());
export const startNewVotingFailure = createAction(RoomActionType.startNewVotingFailure,
  props<{ error: any }>());
export const startTimer = createAction(RoomActionType.startTimer,
  props<{ seconds: number }>());
export const timerStarted = createAction(RoomActionType.timerStarted,
  props<{ timer: RoomTimer }>());
export const stopTimer = createAction(RoomActionType.stopTimer);
export const timerStopped = createAction(RoomActionType.timerStopped);
export const taskChanged = createAction(RoomActionType.taskChanged,
  props<{ task?: TaskDto }>());
// The estimate of the revealed round: any card of the deck
export const acceptEstimate = createAction(RoomActionType.acceptEstimate,
  props<{ revealedAt: string, card: string }>());
export const estimateAccepted = createAction(RoomActionType.estimateAccepted,
  props<{ round: RoundDto }>());
// The person looking at the page turns on or off revealing the cards by themselves once everyone has voted
export const setAutoReveal = createAction(RoomActionType.setAutoReveal,
  props<{ autoReveal: boolean }>());
// Someone in the room turned it on or off, maybe the person looking at the page
export const autoRevealChanged = createAction(RoomActionType.autoRevealChanged,
  props<{ autoReveal: boolean }>());
export const closed = createAction(RoomActionType.closed,
  props<{ roomId: string }>());
// Everyone left the room while this page was open on it without a seat, for example on the join form
export const removed = createAction(RoomActionType.removed,
  props<{ roomId: string }>());
export const doNothing = createAction(RoomActionType.doNothing);
