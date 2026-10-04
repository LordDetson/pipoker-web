export interface Participant {
  nickname: string;
  watcher: boolean;
}

// The server tells participants apart by the nickname without surrounding spaces and case
export function sameNickname(nickname1: string, nickname2: string): boolean {
  return nickname1.trim().toLowerCase() === nickname2.trim().toLowerCase();
}
