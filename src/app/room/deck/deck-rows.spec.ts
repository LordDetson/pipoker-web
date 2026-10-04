import {splitIntoRows} from "./deck-rows";

describe("splitIntoRows", () => {

  function rowLengths(cardCount: number, perRow: number): number[] {
    return splitIntoRows(Array.from({length: cardCount}, (_, index) => index), perRow).map(row => row.length);
  }

  it("keeps the deck in one row while it fits", () => {
    expect(rowLengths(17, 17)).toEqual([17]);
    expect(rowLengths(5, 18)).toEqual([5]);
  });

  it("splits the deck in half when one row is not enough", () => {
    expect(rowLengths(20, 19)).toEqual([10, 10]);
    expect(rowLengths(18, 10)).toEqual([9, 9]);
  });

  it("puts the extra card of an odd deck in the first row", () => {
    expect(rowLengths(17, 16)).toEqual([9, 8]);
    expect(rowLengths(3, 2)).toEqual([2, 1]);
  });

  it("takes more rows by the same rule when two are not enough", () => {
    expect(rowLengths(17, 6)).toEqual([6, 6, 5]);
    expect(rowLengths(10, 4)).toEqual([4, 3, 3]);
    expect(rowLengths(20, 5)).toEqual([5, 5, 5, 5]);
    expect(rowLengths(3, 1)).toEqual([1, 1, 1]);
  });

  it("keeps the order of the deck", () => {
    expect(splitIntoRows(["S", "M", "L", "XL", "XXL"], 3)).toEqual([["S", "M", "L"], ["XL", "XXL"]]);
  });

  it("has no rows for an empty deck", () => {
    expect(splitIntoRows([], 5)).toEqual([]);
  });
});
