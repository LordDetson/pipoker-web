import {AbstractControl, ValidationErrors} from "@angular/forms";

// A room is known by its id, a UUID, and an invitation link ends with it: https://pipoker.app/room/<id>.
// The id is enough to find the room, so a link to any address of the site works, and so does the bare id.
const ROOM_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function roomIdFromInvitation(text: string): string | null {
  return text.match(ROOM_ID)?.[0].toLowerCase() ?? null;
}

export function invitationValidator(control: AbstractControl<string>): ValidationErrors | null {
  const text = control.value.trim();
  return text === "" || roomIdFromInvitation(text) ? null : {invitation: true};
}
