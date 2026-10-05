import {HistoryRound} from "../../store/room/room.selector";
import {I18nService} from "../../i18n/i18n.service";
import {localTime} from "./local-time";
import {historyText} from "./history-text";

// Builds the files the history panel offers to download. The page loads this code only when a file is asked for,
// so it adds nothing to the first load of the site.

export type ExportFormat = "xlsx" | "csv" | "txt" | "xml";

export interface ExportFile {
  name: string;
  type: string;
  content: BlobPart;
}

// A spreadsheet cell: a date becomes a date cell and a number a number cell in Excel
type Cell = string | number | Date;

interface Column {
  header: string;
  value: (round: HistoryRound, vote: { nickname: string; card: string }) => Cell;
  // Width in characters in Excel
  width: number;
  // Values like 5 or 0.5 become number cells in Excel, so they can be summed up; ½, ? and XL stay text
  numbers?: boolean;
}

// Rounds go oldest first, every vote on its own row next to its round, so a spreadsheet can filter and sort them
function columns(i18n: I18nService): Column[] {
  return [
    {header: i18n.translate("history.column.round"), value: round => round.number, width: 8},
    {header: i18n.translate("history.column.task"), value: round => round.task?.name ?? "", width: 30},
    {header: i18n.translate("history.column.taskUrl"), value: round => round.task?.url ?? "", width: 30},
    {header: i18n.translate("history.column.time"), value: round => new Date(round.revealedAt), width: 18},
    {header: i18n.translate("history.column.estimate"), value: round => round.estimate ?? "", width: 12, numbers: true},
    {header: i18n.translate("history.column.result"), value: round => resultOf(round, i18n), width: 20, numbers: true},
    {header: i18n.translate("history.column.participant"), value: (round, vote) => vote.nickname, width: 24},
    {header: i18n.translate("history.column.card"), value: (round, vote) => vote.card, width: 10, numbers: true}
  ];
}

function resultOf(round: HistoryRound, i18n: I18nService): string {
  return round.result ?? i18n.translate("history.split");
}

function rowsOf(rounds: HistoryRound[], table: Column[]): Cell[][] {
  return rounds.flatMap(round => round.votes.map(vote => table.map(column => column.value(round, vote))));
}

// The rounds come oldest first
export function exportHistory(format: ExportFormat, roomName: string, rounds: HistoryRound[], i18n: I18nService,
                              now: Date): ExportFile {
  const name = fileName(roomName, i18n, now);
  switch (format) {
    case "xlsx":
      return {
        name: name + ".xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        content: xlsx(columns(i18n), rounds, i18n)
      };
    case "csv":
      return {name: name + ".csv", type: "text/csv;charset=utf-8", content: csv(columns(i18n), rounds, i18n)};
    case "txt":
      return {name: name + ".txt", type: "text/plain;charset=utf-8", content: historyText(roomName, rounds, i18n, now, "\r\n")};
    case "xml":
      return {name: name + ".xml", type: "application/xml;charset=utf-8", content: xml(roomName, rounds, now)};
  }
}

// Hands the file to the browser as a download
export function saveFile(file: ExportFile): void {
  const url = URL.createObjectURL(new Blob([file.content], {type: file.type}));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  // Browsers take the file name from a link only while it is on the page
  document.body.append(link);
  link.click();
  link.remove();
  // Safari reads the file after the click returns, so the link stays valid for a while
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Like "Sprint 12 history 2026-10-05 14-30": the room's name without the characters Windows forbids in file names
function fileName(roomName: string, i18n: I18nService, now: Date): string {
  const room = roomName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60).trim();
  const time = localTime(now).replace(":", "-");
  return i18n.translate("history.fileName", {room: room || "PiPoker", time});
}

function text(cell: Cell): string {
  return cell instanceof Date ? localTime(cell) : String(cell);
}

// CSV

// Excel in Russian splits CSV lines at semicolons and in English at commas. The byte order mark tells Excel the file
// is UTF-8, otherwise it shows Cyrillic names as gibberish.
function csv(table: Column[], rounds: HistoryRound[], i18n: I18nService): string {
  const separator = i18n.language === "ru" ? ";" : ",";
  const line = (cells: Cell[]) => cells.map(cell => csvField(cell, separator)).join(separator);
  return "\uFEFF" + [table.map(column => column.header), ...rowsOf(rounds, table)].map(line).join("\r\n") + "\r\n";
}

function csvField(cell: Cell, separator: string): string {
  let value = text(cell);
  // A nickname like =HYPERLINK(...) would run as a formula when the file is opened in a spreadsheet
  if (typeof cell === "string" && /^[=+\-@\t\r]/.test(value)) {
    value = "'" + value;
  }
  return value.includes(separator) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// XML: the rounds as the server keeps them, for other programs. Times stay in UTC, as in the server's data. A round
// carries estimate when the team accepted one and result when one card got the most votes.

function xml(roomName: string, rounds: HistoryRound[], now: Date): string {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<history room="${escapeXml(roomName)}" downloadedAt="${now.toISOString()}">`
  ];
  for (const round of rounds) {
    const estimate = round.estimate !== undefined ? ` estimate="${escapeXml(round.estimate)}"` : "";
    const result = round.result !== undefined ? ` result="${escapeXml(round.result)}"` : "";
    const task = round.task
      ? [`    <task name="${escapeXml(round.task.name)}"${round.task.url ? ` url="${escapeXml(round.task.url)}"` : ""}/>`]
      : [];
    lines.push(`  <round number="${round.number}" revealedAt="${escapeXml(round.revealedAt)}"${estimate}${result}>`,
      ...task,
      ...round.votes.map(vote => `    <vote participant="${escapeXml(vote.nickname)}" card="${escapeXml(vote.card)}"/>`),
      `  </round>`);
  }
  lines.push(`</history>`);
  return lines.join("\n") + "\n";
}

// Also drops the control characters XML 1.0 can't hold at all
function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Excel: an .xlsx file is a ZIP archive of a few XML files. Writing them here keeps a spreadsheet library out of the site.

// Cell styles from styles.xml: the header is bold, times show as dates
const PLAIN = 0;
const BOLD = 1;
const DATE_TIME = 2;

function xlsx(table: Column[], rounds: HistoryRound[], i18n: I18nService): Uint8Array<ArrayBuffer> {
  const rows = [table.map(column => column.header), ...rowsOf(rounds, table)];
  const sheetData = rows.map((cells, row) =>
    `<row r="${row + 1}">${cells.map((cell, column) => xlsxCell(cell, cellName(column, row + 1), row === 0, table[column].numbers)).join("")}</row>`);
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${table.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`).join("")}</cols>
<sheetData>${sheetData.join("")}</sheetData>
<autoFilter ref="A1:${cellName(table.length - 1, rows.length)}"/>
</worksheet>`;
  const sheetName = i18n.translate("history.title");
  // Excel keeps the range of the filter under this name too, like 'History'!$A$1:$E$9
  const filterRange = `'${sheetName}'!${cellName(0, 1, true)}:${cellName(table.length - 1, rows.length, true)}`;
  return zip([
    {
      name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${escapeXml(filterRange)}</definedName></definedNames>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      name: "xl/styles.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd\\ hh:mm"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
    },
    {name: "xl/worksheets/sheet1.xml", content: sheet}
  ]);
}

// Like B7, or $B$7 when absolute: the column as letters counted from 0, the row counted from 1
function cellName(column: number, row: number, absolute = false): string {
  let letters = "";
  for (let rest = column + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    letters = String.fromCharCode(65 + (rest - 1) % 26) + letters;
  }
  const mark = absolute ? "$" : "";
  return mark + letters + mark + row;
}

function xlsxCell(cell: Cell, name: string, bold: boolean, numbers?: boolean): string {
  if (cell === "") {
    return "";
  }
  if (cell instanceof Date) {
    return `<c r="${name}" s="${DATE_TIME}"><v>${excelDate(cell)}</v></c>`;
  }
  if (typeof cell === "number" || numbers && !bold && /^-?\d+(\.\d+)?$/.test(cell)) {
    return `<c r="${name}"><v>${Number(cell)}</v></c>`;
  }
  return `<c r="${name}" t="inlineStr" s="${bold ? BOLD : PLAIN}"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
}

// Excel keeps a time as days since 30 December 1899 with no time zone, so it gets the browser's local time
function excelDate(date: Date): number {
  const localMillis = date.getTime() - date.getTimezoneOffset() * 60_000;
  return localMillis / 86_400_000 + 25_569;
}

// A ZIP archive with the files stored as they are: they are small, and a deflate implementation would cost more
// than it saves
function zip(files: { name: string; content: string }[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const directory: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    // Version 2.0, the UTF-8 names flag, stored, 1 January 1980 00:00
    const common = [20, 0x0800, 0, 0, 0x21];
    const local = header([0x04034b50, ...common, crc, data.length, data.length, name.length, 0], [4, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2]);
    directory.push(concat([header(
      [0x02014b50, 20, ...common, crc, data.length, data.length, name.length, 0, 0, 0, 0, 0, offset],
      [4, 2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4]), name]));
    parts.push(local, name, data);
    offset += local.length + name.length + data.length;
  }
  const central = concat(directory);
  const end = header([0x06054b50, 0, 0, files.length, files.length, central.length, offset, 0], [4, 2, 2, 2, 2, 4, 4, 2]);
  return concat([...parts, central, end]);
}

// Little-endian numbers of the given byte sizes, as ZIP headers hold them
function header(values: number[], sizes: number[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(sizes.reduce((sum, size) => sum + size, 0));
  const view = new DataView(bytes.buffer);
  let position = 0;
  values.forEach((value, index) => {
    if (sizes[index] === 4) {
      view.setUint32(position, value, true);
    } else {
      view.setUint16(position, value, true);
    }
    position += sizes[index];
  });
  return bytes;
}

function concat(parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) {
    result.set(part, position);
    position += part.length;
  }
  return result;
}

let crcTable: Uint32Array | undefined;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let bit = 0; bit < 8; bit++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
