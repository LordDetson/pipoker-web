import {TestBed} from "@angular/core/testing";
import {exportHistory, ExportFile} from "./history-export";
import {HistoryRound} from "../../store/room/room.selector";
import {I18nService} from "../../i18n/i18n.service";

describe("exportHistory", () => {
  let i18n: I18nService;

  // Local times, so the expected texts don't depend on the time zone of the computer running the tests
  const now = new Date(2026, 9, 5, 14, 30);
  const rounds: HistoryRound[] = [
    {
      number: 1, revealedAt: new Date(2026, 9, 5, 14, 0, 12).toISOString(), result: "5",
      tally: [{card: "5", count: 2}],
      votes: [{nickname: "Аня", card: "5"}, {nickname: "Dmitry", card: "5"}]
    },
    {
      number: 2, revealedAt: new Date(2026, 9, 5, 14, 7).toISOString(),
      tally: [{card: "½", count: 1}, {card: "13", count: 1}],
      votes: [{nickname: "=HYPERLINK(\"x\")", card: "½"}, {nickname: "Smith; John", card: "13"}]
    }
  ];

  beforeEach(() => {
    i18n = TestBed.inject(I18nService);
    i18n.language = "ru";
  });

  function text(file: ExportFile): string {
    return file.content as string;
  }

  it("names the file after the room and the time of the download", () => {
    expect(exportHistory("csv", "Спринт 12", rounds, i18n, now).name).toBe("Спринт 12 история 2026-10-05 14-30.csv");
    expect(exportHistory("xlsx", "a/b: c?", rounds, i18n, now).name).toBe("a b c история 2026-10-05 14-30.xlsx");
    expect(exportHistory("txt", " ", rounds, i18n, now).name).toBe("PiPoker история 2026-10-05 14-30.txt");
    i18n.language = "en";
    expect(exportHistory("xml", "Sprint", rounds, i18n, now).name).toBe("Sprint history 2026-10-05 14-30.xml");
  });

  it("writes CSV for Excel in Russian with a row per vote", () => {
    const file = exportHistory("csv", "Спринт", rounds, i18n, now);

    expect(file.type).toBe("text/csv;charset=utf-8");
    expect(text(file)).toBe("﻿" + [
      "Раунд;Время;Итог;Участник;Карта",
      "1;2026-10-05 14:00;5;Аня;5",
      "1;2026-10-05 14:00;5;Dmitry;5",
      `2;2026-10-05 14:07;Голоса разделились;"'=HYPERLINK(""x"")";½`,
      `2;2026-10-05 14:07;Голоса разделились;"Smith; John";13`,
      ""
    ].join("\r\n"));
  });

  it("separates CSV fields with commas in English", () => {
    i18n.language = "en";

    expect(text(exportHistory("csv", "Sprint", rounds, i18n, now)).split("\r\n").slice(0, 2)).toEqual([
      "﻿Round,Time,Result,Participant,Card",
      "1,2026-10-05 14:00,5,Аня,5"
    ]);
  });

  it("writes text the way the history panel shows it", () => {
    expect(text(exportHistory("txt", "Спринт", rounds, i18n, now))).toBe([
      "История оценок PiPoker: Спринт",
      "Выгружено 2026-10-05 14:30",
      "",
      "Раунд 1 · 2026-10-05 14:00",
      "Итог: 5",
      "  Аня: 5",
      "  Dmitry: 5",
      "",
      "Раунд 2 · 2026-10-05 14:07",
      "Голоса разделились",
      "  =HYPERLINK(\"x\"): ½",
      "  Smith; John: 13",
      ""
    ].join("\r\n"));
  });

  it("writes XML with the times in UTC and no result for split votes", () => {
    const file = exportHistory("xml", "R&D <1>", rounds, i18n, now);

    expect(file.type).toBe("application/xml;charset=utf-8");
    expect(text(file)).toBe([
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<history room="R&amp;D &lt;1&gt;" downloadedAt="${now.toISOString()}">`,
      `  <round number="1" revealedAt="${rounds[0].revealedAt}" result="5">`,
      `    <vote participant="Аня" card="5"/>`,
      `    <vote participant="Dmitry" card="5"/>`,
      `  </round>`,
      `  <round number="2" revealedAt="${rounds[1].revealedAt}">`,
      `    <vote participant="=HYPERLINK(&quot;x&quot;)" card="½"/>`,
      `    <vote participant="Smith; John" card="13"/>`,
      `  </round>`,
      `</history>`,
      ``
    ].join("\n"));
    expect(new DOMParser().parseFromString(text(file), "application/xml").querySelector("parsererror")).toBeNull();
  });

  describe("Excel", () => {
    // The parts of the archive by name. They are stored uncompressed, so their text can be read straight out of it.
    function parts(file: ExportFile): Map<string, string> {
      const bytes = file.content as Uint8Array;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const decoder = new TextDecoder();
      const result = new Map<string, string>();
      let position = 0;
      while (view.getUint32(position, true) === 0x04034b50) {
        const size = view.getUint32(position + 18, true);
        const nameLength = view.getUint16(position + 26, true);
        const name = decoder.decode(bytes.subarray(position + 30, position + 30 + nameLength));
        const start = position + 30 + nameLength;
        result.set(name, decoder.decode(bytes.subarray(start, start + size)));
        position = start + size;
      }
      expect(view.getUint32(position, true)).withContext("central directory").toBe(0x02014b50);
      return result;
    }

    function sheet(file: ExportFile): Document {
      return new DOMParser().parseFromString(parts(file).get("xl/worksheets/sheet1.xml")!, "application/xml");
    }

    it("packs a workbook Excel opens", () => {
      const file = exportHistory("xlsx", "Спринт", rounds, i18n, now);

      expect(file.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const names = [...parts(file).keys()];
      expect(names).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels",
        "xl/styles.xml", "xl/worksheets/sheet1.xml"]);
      for (const [name, content] of parts(file)) {
        expect(new DOMParser().parseFromString(content, "application/xml").querySelector("parsererror"))
          .withContext(name).toBeNull();
      }
      expect(parts(file).get("xl/workbook.xml")).toContain(`<sheet name="История"`);
    });

    it("keeps times as dates and number cards as numbers", () => {
      const rows = Array.from(sheet(exportHistory("xlsx", "Спринт", rounds, i18n, now)).querySelectorAll("row"));
      const cells = (row: Element) => Array.from(row.querySelectorAll("c"))
        .map(cell => ({ref: cell.getAttribute("r"), type: cell.getAttribute("t"), text: cell.textContent}));

      expect(rows.length).toBe(5);
      expect(cells(rows[0]).map(cell => cell.text)).toEqual(["Раунд", "Время", "Итог", "Участник", "Карта"]);
      const first = cells(rows[1]);
      expect(first.map(cell => cell.ref)).toEqual(["A2", "B2", "C2", "D2", "E2"]);
      expect(first[0]).toEqual({ref: "A2", type: null, text: "1"});
      // 5 October 2026 14:00:12 counted in days from 30 December 1899
      expect(Number(first[1].text)).toBeCloseTo(46300 + (14 * 3600 + 12) / 86400, 6);
      expect(first[4]).toEqual({ref: "E2", type: null, text: "5"});
      expect(cells(rows[3])[4]).toEqual({ref: "E4", type: "inlineStr", text: "½"});
      expect(cells(rows[3])[3].text).toBe("=HYPERLINK(\"x\")");
    });
  });
});
