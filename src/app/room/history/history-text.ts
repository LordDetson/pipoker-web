import {HistoryRound} from "../../store/room/room.selector";
import {I18nService} from "../../i18n/i18n.service";
import {localTime} from "./local-time";

// The history as text, the same as the history panel shows it: the text file of the download and the summary the
// panel copies to paste into Jira or a chat. It is small, so it comes with the site: the copy has to happen at the
// click, without waiting for the download code to load.

// The rounds come oldest first. Text files on Windows break lines with \r\n, the clipboard with \n.
export function historyText(roomName: string, rounds: HistoryRound[], i18n: I18nService, now: Date,
                            lineBreak: string): string {
  const lines = [
    i18n.translate("history.file.title", {room: roomName}),
    i18n.translate("history.file.downloaded", {time: localTime(now)})
  ];
  for (const round of rounds) {
    lines.push(
      "",
      [i18n.translate("history.round", {number: round.number}), round.task?.name, localTime(new Date(round.revealedAt))]
        .filter(part => part).join(" · "),
      ...round.task?.url ? [round.task.url] : [],
      // The accepted estimate takes the place of the vote result, as in the panel
      round.estimate !== undefined ? i18n.translate("history.estimate", {card: round.estimate})
        : round.result !== undefined ? i18n.translate("history.result", {card: round.result}) : i18n.translate("history.split"),
      ...round.votes.map(vote => `  ${vote.nickname}: ${vote.card}`));
  }
  return lines.join(lineBreak) + lineBreak;
}
