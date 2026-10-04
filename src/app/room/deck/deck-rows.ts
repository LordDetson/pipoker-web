// Lays the cards out in as few rows as needed when a row holds at most perRow cards, keeping the rows even: their
// lengths differ by one card at most, and the upper rows take the extra cards.
export function splitIntoRows<T>(cards: T[], perRow: number): T[][] {
  const rowCount = Math.ceil(cards.length / perRow);
  const shortRow = Math.floor(cards.length / rowCount);
  const longRows = cards.length % rowCount;
  const rows: T[][] = [];
  let start = 0;
  for (let row = 0; row < rowCount; row++) {
    const length = row < longRows ? shortRow + 1 : shortRow;
    rows.push(cards.slice(start, start + length));
    start += length;
  }
  return rows;
}
