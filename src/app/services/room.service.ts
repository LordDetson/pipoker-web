import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {map, Observable} from "rxjs";
import {Room} from "../models/room.model";
import {Card} from "../models/card.model";
import {Participant} from "../models/participant.model";
import {Vote} from "../models/vote";
import {RoomWebSocketService} from "./room-web-socket.service";
import {environment} from "../../env/env";

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  constructor(
    private http: HttpClient,
    private roomWebSocketService: RoomWebSocketService
  ) {
  }

  create(createRoom: any): Observable<Room> {
    return this.http.post<Room>(environment.apiUrl + "/room", createRoom, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }).pipe(
      map((room: Room) => {
        room.votingResult.map = new Map<string, Card>(Object.entries(room.votingResult.map))
        return room;
      })
    );
  }

  get(id: string): Observable<Room> {
    return this.http.get<Room>(environment.apiUrl + "/room/" + id, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      map((room: Room) => {
        room.votingResult.map = new Map<string, Card>(Object.entries(room.votingResult.map))
        return room;
      })
    );
  }

  checkIfNicknameExist(id: string, nickname: string): Observable<boolean> {
    return this.http.get<boolean>(environment.apiUrl + "/room/" + id + "/check-if-nickname-exist", {
      headers: {
        'Content-Type': 'application/json'
      },
      params: new HttpParams().set('nickname', nickname)
    });
  }

  addParticipant(id: string, participant: Participant): Observable<Participant> {
    return this.http.put<Participant>(environment.apiUrl + "/room/" + id + "/add-participant", participant, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  removeParticipant(id: string, participant: Participant): Observable<Participant> {
    return this.http.delete<Participant>(environment.apiUrl + "/room/" + id + "/remove-participant", {
      headers: {
        'Content-Type': 'application/json'
      },
      params: new HttpParams().set('nickname', participant.nickname)
    });
  }

  vote(id: string, participant: Participant, card: Card): Observable<Vote> {
    const vote: Vote = {participant, card}
    return this.http.post<Vote>(environment.apiUrl + "/room/" + id + "/vote", vote, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  clearVotingResult(id: string): Observable<void> {
    return this.http.get<void>(environment.apiUrl + "/room/" + id + "/clearVotingResult", {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  showVotingResult(roomId: string) {
    this.roomWebSocketService.sendShowVotingResultEvent(roomId);
  }
}
