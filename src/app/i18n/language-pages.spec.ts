import {pageAddress, splitAddress, switchAddress} from "./language-pages";

describe("language pages", () => {
  it("gives the address of a page in a language, or without one", () => {
    expect(pageAddress("/", null)).toBe("/");
    expect(pageAddress("/", "en")).toBe("/en");
    expect(pageAddress("/guide", null)).toBe("/guide");
    expect(pageAddress("/guide", "ru")).toBe("/ru/guide");
  });

  it("finds the language an address starts with", () => {
    expect(splitAddress("/en/guide?from=hn")).toEqual({language: "en", rest: "/guide?from=hn"});
    expect(splitAddress("/ru")).toEqual({language: "ru", rest: "/"});
    expect(splitAddress("/en?from=hn")).toEqual({language: "en", rest: "/?from=hn"});
    expect(splitAddress("/guide")).toEqual({language: null, rest: "/guide"});
    // A room id that happens to start with a language is no language
    expect(splitAddress("/room/ru1")).toEqual({language: null, rest: "/room/ru1"});
    expect(splitAddress("/russian")).toEqual({language: null, rest: "/russian"});
  });

  it("gives the same address in another language, keeping what follows", () => {
    expect(switchAddress("/en", "ru")).toBe("/ru");
    expect(switchAddress("/en/guide", "ru")).toBe("/ru/guide");
    expect(switchAddress("/ru?from=vc", "en")).toBe("/en?from=vc");
    expect(switchAddress("/ru/guide#decks", "en")).toBe("/en/guide#decks");
  });
});
