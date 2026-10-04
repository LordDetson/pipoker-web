import {Action, createReducer, on} from "@ngrx/store";
import * as RoomAction from "./room.action";
import {Participant, sameNickname} from "../../models/participant.model";
import {Card} from "../../models/card.model";
import {RoomState, RoomStatus} from "./room-state";
import {ErrorCode} from "../../models/room-event";

const initialRoomState: RoomState = {
  room: {
    id: "",
    name: "",
    deck: {
      cards: []
    },
    participants: [],
    votingResult: {
      map: new Map<string, Card>([])
    },
    history: []
  },
  showVotingResult: false,
  error: undefined,
  status: RoomStatus.pending
};

const _roomReducer = createReducer<RoomState>(initialRoomState,
  on(RoomAction.create, (state) => ({
    ...state,
    status: RoomStatus.loading
  })),
  on(RoomAction.get, (state) => ({
    ...state,
    status: RoomStatus.loading
  })),
  on(RoomAction.initSuccess, RoomAction.refreshSuccess, (state, {room}) => ({
    ...state,
    room,
    showVotingResult: room.votesShown ?? false,
    status: RoomStatus.success
  })),
  on(RoomAction.initFailure, failed),
  // Someone who refreshed the page comes back with this event and in the room loaded right after it, in either order
  on(RoomAction.addParticipantSuccess, (state, {participant}) => ({
    ...state,
    room: {
      ...state.room,
      participants: state.room.participants.some(existing => sameNickname(existing.nickname, participant.nickname))
        ? state.room.participants
        : [...state.room.participants, participant]
    }
  })),
  on(RoomAction.addParticipantFailure, failed),
  on(RoomAction.removeParticipantSuccess, (state, {participant}) => {
    let map: Map<string, Card> = new Map<string, Card>(state.room.votingResult.map);
    map.delete(participant.nickname);
    return {
      ...state,
      room: {
        ...state.room,
        participants: state.room.participants.filter((item) => item.nickname !== participant.nickname),
        votingResult: {
          ...state.room.votingResult,
          map
        }
      }
    }
  }),
  on(RoomAction.removeParticipantFailure, failed),
  on(RoomAction.selectCard, state => ({
    ...state,
    status: RoomStatus.loading
  })),
  on(RoomAction.cardSelectionSuccess, (state, {participant, card}) => {
    let map: Map<string, Card> = new Map<string, Card>(state.room.votingResult.map);
    map.set(participant.nickname, card);
    return {
      ...state,
      room: {
        ...state.room,
        votingResult: {
          ...state.room.votingResult,
          map
        }
      },
      status: RoomStatus.success
    };
  }),
  on(RoomAction.cardSelectionFailure, failed),
  // The room loaded again after a reconnect may already have the round of a late event
  on(RoomAction.showVotingResultSuccess, (state, {round}) => ({
    ...state,
    room: round && !state.room.history.some(recorded => recorded.revealedAt === round.revealedAt)
      ? {...state.room, history: [...state.room.history, round]}
      : state.room,
    showVotingResult: true
  })),
  on(RoomAction.startNewVotingSuccess, state => ({
    ...state,
    room: {
      ...state.room,
      votingResult: {
        ...state.room.votingResult,
        map: new Map<string, Card>()
      }
    },
    showVotingResult: false,
    status: RoomStatus.success
  })),
  on(RoomAction.startNewVotingFailure, failed),
  // Nothing of the room is left: no name or invitation in the header
  on(RoomAction.closed, () => ({
    ...initialRoomState,
    status: RoomStatus.closed
  })),
  on(RoomAction.removed, () => ({
    ...initialRoomState,
    status: RoomStatus.missing
  })),
)

// A request about a room that doesn't exist anymore shows that instead of the error
function failed(state: RoomState, {error}: { error: any }): RoomState {
  return {
    ...state,
    error,
    status: error?.code === ErrorCode.roomNotFound ? RoomStatus.missing : RoomStatus.error
  };
}

export function roomReducer(state: RoomState | undefined, action: Action) {
  return _roomReducer(state, action);
}
