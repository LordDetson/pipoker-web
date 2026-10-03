import {Injectable} from '@angular/core';
import {filter, map, merge, Observable, take} from "rxjs";
import {Room} from "../models/room.model";
import {Card} from "../models/card.model";
import {Participant} from "../models/participant.model";
import {Vote} from "../models/vote";
import {RoomWebSocketService} from "./room-web-socket.service";
import {CreateRoomInfo} from "../models/create-room.model";
import {RoomCreationDto, RoomDto} from "../models/room-dto.model";
import {ErrorEvent, RoomEvent, RoomEventType} from "../models/room-event";
import {RoomDestinations} from "../common/room-destinations";

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  constructor(
    private roomWebSocketService: RoomWebSocketService
  ) {
  }

  create(createRoomInfo: CreateRoomInfo): Observable<Room> {
    const roomCreation: RoomCreationDto = {
      name: createRoomInfo.roomName,
      deck: {cards: createRoomInfo.deck.cards.map(card => card.value)},
      participants: [{nickname: createRoomInfo.nickname, watcher: createRoomInfo.watcher}]
    };
    return this.exchange(RoomDestinations.create(), roomCreation,
      this.roomWebSocketService.watch<RoomDto>(RoomDestinations.created).pipe(
        map(room => toRoom(room))
      )
    );
  }

  get(id: string): Observable<Room> {
    const destination = RoomDestinations.room(id);
    return merge(
      this.roomWebSocketService.request<RoomDto>(destination),
      this.errors(destination)
    ).pipe(
      take(1),
      map(room => toRoom(room))
    );
  }

  checkIfNicknameExist(id: string, nickname: string): Observable<boolean> {
    return this.get(id).pipe(
      map(room => room.participants.some(participant => sameNickname(participant.nickname, nickname)))
    );
  }

  addParticipant(id: string, participant: Participant): Observable<Participant> {
    return this.exchange(RoomDestinations.addParticipant(id), participant,
      this.roomEvents(id, RoomEventType.participantAdded).pipe(
        map(event => event.participant!),
        filter(added => sameNickname(added.nickname, participant.nickname))
      )
    );
  }

  removeParticipant(id: string, participant: Participant): Observable<Participant> {
    return this.exchange(RoomDestinations.removeParticipant(id), participant.nickname,
      this.roomEvents(id, RoomEventType.participantRemoved).pipe(
        filter(event => event.participant !== undefined && sameNickname(event.participant.nickname, participant.nickname)),
        map(event => event.participant!)
      )
    );
  }

  vote(id: string, participant: Participant, card: Card): Observable<Vote> {
    return this.exchange(RoomDestinations.addVote(id), {nickname: participant.nickname, card: card.value},
      this.roomEvents(id, RoomEventType.voteAdded).pipe(
        filter(event => sameNickname(event.vote!.nickname, participant.nickname)),
        map(event => ({participant, card: {value: event.vote!.card}}))
      )
    );
  }

  clearVotingResult(id: string): Observable<void> {
    return this.exchange(RoomDestinations.clearVotes(id), id,
      this.roomEvents(id, RoomEventType.clearVotes).pipe(
        map(() => undefined)
      )
    );
  }

  showVotingResult(roomId: string) {
    this.roomWebSocketService.send(RoomDestinations.showVotes(roomId), roomId);
  }

  private exchange<T>(destination: string, body: any, reply$: Observable<T>): Observable<T> {
    return new Observable<T>(subscriber => {
      const subscription = merge(reply$, this.errors(destination)).pipe(take(1)).subscribe(subscriber);
      this.roomWebSocketService.send(destination, body);
      return subscription;
    });
  }

  private roomEvents(id: string, eventType: RoomEventType): Observable<RoomEvent> {
    return this.roomWebSocketService.watch<RoomEvent>(RoomDestinations.roomTopic(id)).pipe(
      filter(event => event.eventType === eventType)
    );
  }

  private errors(destination: string): Observable<never> {
    return this.roomWebSocketService.watch<ErrorEvent>(RoomDestinations.errors).pipe(
      filter(error => error.destination === destination),
      map(error => {
        throw error;
      })
    );
  }
}

function toRoom(room: RoomDto): Room {
  const map = new Map<string, Card>();
  (room.votes ?? []).forEach(vote => map.set(vote.nickname, {value: vote.card}));
  return {
    id: room.id,
    name: room.name,
    deck: {cards: room.deck.cards.map(value => ({value}))},
    participants: room.participants ?? [],
    votingResult: {map}
  };
}

function sameNickname(nickname1: string, nickname2: string): boolean {
  return nickname1.trim().toLowerCase() === nickname2.trim().toLowerCase();
}
