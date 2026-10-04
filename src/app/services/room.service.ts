import {Injectable} from '@angular/core';
import {filter, map, merge, Observable, take} from "rxjs";
import {Room, toTimer} from "../models/room.model";
import {Card} from "../models/card.model";
import {Participant, sameNickname} from "../models/participant.model";
import {Vote} from "../models/vote";
import {RoomWebSocketService} from "./room-web-socket.service";
import {CreateRoomInfo} from "../models/create-room.model";
import {RoomCreationDto, RoomDto, TimerDto} from "../models/room-dto.model";
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
    // Errors are subscribed to first. The server handles the frames of a connection in order, so if the request came
    // first, its error would be sent while nothing was subscribed to receive it.
    return merge(
      this.errors(destination),
      this.roomWebSocketService.request<RoomDto>(destination)
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

  // Takes the seat back after a page refresh or a lost connection. Fails when the participant has left the room meanwhile.
  returnParticipant(id: string, participant: Participant): Observable<Participant> {
    return this.exchange(RoomDestinations.returnParticipant(id), participant.nickname,
      this.roomWebSocketService.watch<RoomEvent>(RoomDestinations.returned).pipe(
        filter(event => event.roomId === id && event.participant !== undefined
          && sameNickname(event.participant.nickname, participant.nickname)),
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

  // Everyone in the room hears that the timer started or stopped, this page too
  startTimer(roomId: string, seconds: number) {
    const timer: TimerDto = {seconds};
    this.roomWebSocketService.send(RoomDestinations.startTimer(roomId), timer);
  }

  stopTimer(roomId: string) {
    this.roomWebSocketService.send(RoomDestinations.stopTimer(roomId), roomId);
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
    votingResult: {map},
    votesShown: room.votesShown ?? false,
    timer: room.timer && toTimer(room.timer)
  };
}
