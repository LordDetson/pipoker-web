import {Action, createReducer, on} from "@ngrx/store";
import * as RoomAction from "./room.action";
import {Participant, sameNickname} from "../../models/participant.model";
import {Card} from "../../models/card.model";
import {RoomState, RoomStatus} from "./room-state";

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
    }
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
  on(RoomAction.initFailure, (state, {error}) => ({
    ...state,
    error,
    status: RoomStatus.error
  })),
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
  on(RoomAction.addParticipantFailure, (state, {error}) => ({
    ...state,
    error,
    status: RoomStatus.error
  })),
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
  on(RoomAction.removeParticipantFailure, (state, {error}) => ({
    ...state,
    error,
    status: RoomStatus.error
  })),
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
  on(RoomAction.cardSelectionFailure, (state, {error}) => ({
    ...state,
    error,
    status: RoomStatus.error
  })),
  on(RoomAction.showVotingResultSuccess, state => ({
    ...state,
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
  on(RoomAction.startNewVotingFailure, (state, {error}) => ({
    ...state,
    error,
    status: RoomStatus.error
  })),
)

export function roomReducer(state: RoomState | undefined, action: Action) {
  return _roomReducer(state, action);
}
