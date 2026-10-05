export class RoomDestinations {
  public static readonly appPrefix: string = "/app/room";
  public static readonly roomTopicPrefix: string = "/topic/room.";
  public static readonly created: string = "/user/topic/room.created";
  public static readonly errors: string = "/user/topic/room.errors";
  public static readonly returned: string = "/user/topic/room.returned";
  public static readonly pageClosed: string = "/app/presence/page-closed";

  public static create(): string {
    return RoomDestinations.appPrefix + "/create";
  }

  public static room(roomId: string): string {
    return RoomDestinations.appPrefix + "/" + roomId;
  }

  public static roomTopic(roomId: string): string {
    return RoomDestinations.roomTopicPrefix + roomId;
  }

  public static addParticipant(roomId: string): string {
    return RoomDestinations.room(roomId) + "/participants/add";
  }

  public static removeParticipant(roomId: string): string {
    return RoomDestinations.room(roomId) + "/participants/remove";
  }

  public static returnParticipant(roomId: string): string {
    return RoomDestinations.room(roomId) + "/participants/return";
  }

  public static changeRole(roomId: string): string {
    return RoomDestinations.room(roomId) + "/participants/role";
  }

  public static addVote(roomId: string): string {
    return RoomDestinations.room(roomId) + "/votes/add";
  }

  public static clearVotes(roomId: string): string {
    return RoomDestinations.room(roomId) + "/votes/clear";
  }

  public static showVotes(roomId: string): string {
    return RoomDestinations.room(roomId) + "/votes/show";
  }

  public static startTimer(roomId: string): string {
    return RoomDestinations.room(roomId) + "/timer/start";
  }

  public static stopTimer(roomId: string): string {
    return RoomDestinations.room(roomId) + "/timer/stop";
  }

  public static task(roomId: string): string {
    return RoomDestinations.room(roomId) + "/task";
  }

  public static estimate(roomId: string): string {
    return RoomDestinations.room(roomId) + "/estimate";
  }

  public static autoReveal(roomId: string): string {
    return RoomDestinations.room(roomId) + "/auto-reveal";
  }
}
