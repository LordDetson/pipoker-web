import {Participant} from "../models/participant.model";
import {Card} from "../models/card.model";
import {Room} from "../models/room.model";
import {RoomState, RoomStatus} from "../store/room/room-state";
import {CurrentParticipantState, CurrentParticipantStatus} from "../store/participant/current-participant-state";
import {AppState, currentParticipantStateNode, roomStateNode} from "../store/intex";

export const ROOM_ID = "4f9c7a52-2d5e-4c5b-9a8e-0a1b2c3d4e5f";

export function participant(nickname: string, watcher: boolean = false): Participant {
  return {nickname, watcher};
}

export function cards(...values: string[]): Card[] {
  return values.map(value => ({value}));
}

export function votes(entries: { [nickname: string]: string } = {}): Map<string, Card> {
  return new Map<string, Card>(Object.entries(entries).map(([nickname, value]) => [nickname, {value}]));
}

export function room(overrides: Partial<Room> = {}): Room {
  return {
    id: ROOM_ID,
    name: "Sprint",
    deck: {cards: cards("1h", "2h", "1d")},
    participants: [participant("Dmitry")],
    votingResult: {map: votes()},
    history: [],
    ...overrides
  };
}

export function roomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    room: room(),
    showVotingResult: false,
    error: undefined,
    status: RoomStatus.success,
    ...overrides
  };
}

export function currentParticipantState(overrides: Partial<CurrentParticipantState> = {}): CurrentParticipantState {
  return {
    currentParticipant: participant("Dmitry"),
    selectedCard: undefined,
    error: undefined,
    status: CurrentParticipantStatus.success,
    ...overrides
  };
}

export function appState(
  room: Partial<RoomState> = {},
  currentParticipant: Partial<CurrentParticipantState> = {}
): AppState {
  return {
    [roomStateNode]: roomState(room),
    [currentParticipantStateNode]: currentParticipantState(currentParticipant)
  };
}
