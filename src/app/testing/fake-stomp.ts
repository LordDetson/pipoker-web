import {Participant} from "../models/participant.model";
import {RoomDto, RoundDto, VoteDto} from "../models/room-dto.model";
import {ErrorCode, ErrorEvent, RoomEvent, RoomEventType} from "../models/room-event";

export interface SentFrame {
  destination: string;
  headers: any;
  body: string;
}

// Stands in for the stompjs client: records what the application sends and lets tests deliver messages.
// Like stompjs it keeps message callbacks in "subscriptions" by subscription id.
export class FakeStompClient {
  subscriptions: { [id: string]: (message: { body: string }) => void } = {};
  destinations: { [id: string]: string } = {};
  sent: SentFrame[] = [];
  heartbeat = {outgoing: 10000, incoming: 10000};
  unsubscribed: string[] = [];
  connectCalls = 0;
  disconnected = false;
  private onConnect?: () => void;
  private onError?: (error: any) => void;
  private nextId = 0;

  constructor(private server?: FakePipokerServer) {
  }

  connect(headers: any, onConnect: () => void, onError: (error: any) => void) {
    this.connectCalls++;
    this.onConnect = onConnect;
    this.onError = onError;
    this.server?.connected(this);
  }

  completeConnect() {
    this.onConnect!();
  }

  failConnect(error: any = "Whoops! Lost connection") {
    this.onError!(error);
  }

  // The connection breaks: nothing sent to it arrives anymore
  lose() {
    this.subscriptions = {};
    this.server?.disconnected(this);
    this.failConnect();
  }

  subscribe(destination: string, callback: (message: { body: string }) => void) {
    const id = "sub-" + this.nextId++;
    this.subscriptions[id] = callback;
    this.destinations[id] = destination;
    this.server?.subscribed(this, id, destination);
    return {
      id,
      unsubscribe: () => {
        this.unsubscribed.push(destination);
        delete this.subscriptions[id];
      }
    };
  }

  send(destination: string, headers: any, body: string) {
    this.sent.push({destination, headers, body});
    this.server?.received(this, destination, body);
  }

  disconnect() {
    this.disconnected = true;
  }

  // Delivers a message to every live subscription to the destination.
  deliver(destination: string, payload: any) {
    Object.keys(this.subscriptions)
      .filter(id => this.destinations[id] === destination)
      .forEach(id => this.deliverTo(id, payload));
  }

  deliverTo(subscriptionId: string, payload: any) {
    this.subscriptions[subscriptionId]?.({body: JSON.stringify(payload)});
  }

  isSubscribed(destination: string): boolean {
    return Object.keys(this.subscriptions).some(id => this.destinations[id] === destination);
  }
}

interface ServerRoom {
  id: string;
  name: string;
  cards: string[];
  participants: Participant[];
  votes: VoteDto[];
  votesShown?: boolean;
  history: RoundDto[];
}

// An in-memory imitation of the pipoker-app STOMP API, so tests can run the whole client against it.
// Every reply is delivered asynchronously, like it would arrive over the network.
export class FakePipokerServer {
  readonly clients: FakeStompClient[] = [];
  readonly rooms = new Map<string, ServerRoom>();
  private nextRoomId = 1;

  readonly createClient = (): FakeStompClient => {
    const client = new FakeStompClient(this);
    this.clients.push(client);
    return client;
  };

  addRoom(name: string, cards: string[], participants: Participant[] = [], votes: VoteDto[] = []): string {
    const id = "room-" + this.nextRoomId++;
    this.rooms.set(id, {id, name, cards, participants, votes, history: []});
    return id;
  }

  // Actions of other people in the room, as they would come from their browsers.
  join(roomId: string, participant: Participant) {
    this.received(undefined, "/app/room/" + roomId + "/participants/add", JSON.stringify(participant));
  }

  leave(roomId: string, nickname: string) {
    this.received(undefined, "/app/room/" + roomId + "/participants/remove", nickname);
  }

  vote(roomId: string, nickname: string, card: string) {
    this.received(undefined, "/app/room/" + roomId + "/votes/add", JSON.stringify({nickname, card}));
  }

  showVotes(roomId: string) {
    this.received(undefined, "/app/room/" + roomId + "/votes/show", roomId);
  }

  clearVotes(roomId: string) {
    this.received(undefined, "/app/room/" + roomId + "/votes/clear", roomId);
  }

  // Like pipoker-app when nobody did anything in the room for long
  closeIdleRoom(roomId: string) {
    const room = this.rooms.get(roomId)!;
    this.rooms.delete(roomId);
    this.broadcast(room, RoomEventType.roomClosed, {});
  }

  // Like pipoker-app when nobody came back to the room after the last person left
  removeEmptyRoom(roomId: string) {
    const room = this.rooms.get(roomId)!;
    this.rooms.delete(roomId);
    this.broadcast(room, RoomEventType.roomRemoved, {});
  }

  // Every open connection breaks at once, like when the network is gone
  loseConnections() {
    [...this.clients].forEach(client => client.lose());
  }

  connected(client: FakeStompClient) {
    later(() => client.completeConnect());
  }

  disconnected(client: FakeStompClient) {
    this.clients.splice(this.clients.indexOf(client), 1);
  }

  subscribed(client: FakeStompClient, subscriptionId: string, destination: string) {
    const roomId = /^\/app\/room\/([^/]+)$/.exec(destination)?.[1];
    if (roomId === undefined) {
      return;
    }
    const room = this.rooms.get(roomId);
    if (room) {
      later(() => client.deliverTo(subscriptionId, toDto(room)));
    } else {
      later(() => client.deliver("/user/topic/room.errors", roomNotFound(destination, roomId)));
    }
  }

  received(client: FakeStompClient | undefined, destination: string, body: string) {
    if (destination === "/app/room/create") {
      const creation = JSON.parse(body);
      const problem = roomProblem(creation.name, creation.deck.cards, creation.participants);
      if (problem) {
        this.error(client, destination, problem);
        return;
      }
      const id = this.addRoom(creation.name, creation.deck.cards, creation.participants);
      later(() => client?.deliver("/user/topic/room.created", toDto(this.rooms.get(id)!)));
      return;
    }
    const [, roomId, action] = /^\/app\/room\/([^/]+)\/(.+)$/.exec(destination) ?? [];
    const room = this.rooms.get(roomId);
    if (!room) {
      later(() => client?.deliver("/user/topic/room.errors", roomNotFound(destination, roomId)));
      return;
    }
    switch (action) {
      case "participants/add": {
        const participant: Participant = JSON.parse(body);
        const problem = nameProblem("nickname", participant.nickname);
        if (problem) {
          this.error(client, destination, problem);
          return;
        }
        if (room.participants.some(existing => sameNickname(existing.nickname, participant.nickname))) {
          this.error(client, destination, participant.nickname + " is already in the room");
          return;
        }
        room.participants.push(participant);
        this.broadcast(room, RoomEventType.participantAdded, {participant});
        break;
      }
      case "participants/return": {
        const participant = room.participants.find(existing => sameNickname(existing.nickname, body));
        if (!participant) {
          this.error(client, destination, "Participant \"" + body + "\" is not in the room \"" + roomId + "\"");
          return;
        }
        const event: RoomEvent = {roomId, eventType: RoomEventType.participantReturned, participant};
        later(() => client?.deliver("/user/topic/room.returned", event));
        break;
      }
      case "participants/remove": {
        const participant = room.participants.find(existing => sameNickname(existing.nickname, body));
        room.participants = room.participants.filter(existing => existing !== participant);
        room.votes = room.votes.filter(vote => !sameNickname(vote.nickname, body));
        this.broadcast(room, RoomEventType.participantRemoved, {participant});
        break;
      }
      case "votes/add": {
        const vote: VoteDto = JSON.parse(body);
        room.votes = room.votes.filter(existing => !sameNickname(existing.nickname, vote.nickname)).concat(vote);
        this.broadcast(room, RoomEventType.voteAdded, {vote});
        break;
      }
      case "votes/clear":
        room.votes = [];
        room.votesShown = false;
        this.broadcast(room, RoomEventType.clearVotes, {});
        break;
      case "votes/show": {
        // Like pipoker-app, the first reveal of a round with votes records it in the history
        const round: RoundDto | undefined = room.votesShown || !room.votes.length
          ? undefined
          : {revealedAt: new Date().toISOString(), votes: room.votes.map(vote => ({...vote}))};
        if (round) {
          room.history = [...room.history, round];
        }
        room.votesShown = true;
        this.broadcast(room, RoomEventType.showVotes, round ? {round} : {});
        break;
      }
      default:
        this.error(client, destination, "Unknown destination");
    }
  }

  private broadcast(room: ServerRoom, eventType: RoomEventType, details: Partial<RoomEvent>) {
    const event: RoomEvent = {roomId: room.id, eventType, ...details};
    later(() => this.clients.forEach(client => client.deliver("/topic/room." + room.id, event)));
  }

  private error(client: FakeStompClient | undefined, destination: string, message: string) {
    later(() => client?.deliver("/user/topic/room.errors", {destination, message}));
  }
}

function roomNotFound(destination: string, roomId: string): ErrorEvent {
  return {destination, message: "Room \"" + roomId + "\" is not found", code: ErrorCode.roomNotFound};
}

function toDto(room: ServerRoom): RoomDto {
  return {
    id: room.id,
    name: room.name,
    deck: {cards: [...room.cards]},
    participants: room.participants.map(participant => ({...participant})),
    votes: room.votes.map(vote => ({...vote})),
    ...(room.history.length ? {history: room.history.map(round => ({...round, votes: round.votes.map(vote => ({...vote}))}))} : {}),
    // Like pipoker-app, which leaves it out while the cards are hidden
    ...(room.votesShown ? {votesShown: true} : {})
  };
}

// The checks pipoker-app makes since LordDetson/pipoker-app#11.
function roomProblem(name: string, cards: string[], participants: Participant[]): string | undefined {
  if (cards.length < 1 || cards.length > 20) {
    return "deck.cards - size must be between 1 and 20";
  }
  if (cards.some(card => card.trim().length === 0)) {
    return "value - must not be blank";
  }
  if (cards.some(card => card.trim().length > 6)) {
    return "value - size must be between 1 and 6";
  }
  return nameProblem("name", name)
    ?? participants.map(participant => nameProblem("nickname", participant.nickname)).find(problem => problem);
}

function nameProblem(field: string, value: string): string | undefined {
  const length = value.trim().length;
  return length < 2 || length > 32 ? field + " - size must be between 2 and 32" : undefined;
}

function sameNickname(nickname1: string, nickname2: string): boolean {
  return nickname1.trim().toLowerCase() === nickname2.trim().toLowerCase();
}

function later(callback: () => void) {
  setTimeout(callback);
}
