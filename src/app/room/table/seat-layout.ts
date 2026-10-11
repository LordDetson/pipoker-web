export interface Point {
  x: number;
  y: number;
}

export interface SeatLayout {
  // The height of a card on the table, as a part of the table's smaller side
  cardSize: number;
  // The width of a seat: the card with the nickname under it
  seatWidth: number;
  // The centres of the seats, in percent of the table's width and height
  seats: Point[];
}

// A rectangle on the table, in pixels from its top left corner
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// A card on the table is this part of the table's smaller side tall, as long as the seats fit around the table
const CARD_SIZE = 0.2;
// A seat is this many card heights wide; it is not as tall, so the width decides how close to the edge it can sit
const SEAT_WIDTH = 1.5;
// The space between neighbouring seats and between a seat and the edge of the table, as a part of the smaller side
const SPACING = 0.03;
// Cards get no smaller than this to keep the seats clear of the controls in the middle of the table
const MIN_CARD_SIZE = 0.1;
// The nickname under a card: its font is a part of the card's height, but no smaller than 0.7rem, and its line is
// 1.2 times as tall, see TableCardComponent. So is the gap between the card and the nickname.
const NICKNAME_SIZE = 0.17;
const NICKNAME_MIN_FONT = 0.7 * 16;
const NICKNAME_LINE_HEIGHT = 1.2;
const NICKNAME_GAP = 0.06;
// The least room between a seat and the controls in the middle of the table, in pixels
const CONTROLS_GAP = 4;

// Seats the given number of people evenly around a poker table of the given size: a stadium, as drawn by an element
// with fully rounded corners. The first seat is in the middle of the bottom edge, nearest to the deck, the others
// follow clockwise. When there are too many people for full-size seats, the seats get smaller. They also get smaller
// when a seat would cover the controls in the middle of the table: on a table about as tall as wide the seats at the top
// and at the bottom come close to the middle.
export function seatLayout(count: number, width: number, height: number, controls?: Box): SeatLayout {
  const side = Math.min(width, height);
  // The seats sit SPACING and half a seat in from the edge, so the way around through them is
  // 2 * |width - height| + PI * side * (1 - 2 * SPACING - SEAT_WIDTH * cardSize): the larger the cards, the shorter it is.
  // The largest cards that fit are those for which it holds exactly count seats with SPACING between them.
  const fittingCardSize = (2 * Math.abs(width - height) + Math.PI * side * (1 - 2 * SPACING) - count * side * SPACING)
    / (side * SEAT_WIDTH * (count + Math.PI));
  const largest = layoutWith(Math.min(CARD_SIZE, fittingCardSize), count, width, height);
  if (!controls || clearOf(controls, largest, width, height)) {
    return largest;
  }
  // The largest cards whose seats keep clear of the controls: smaller seats sit closer to the edge and are shorter.
  // Below the smallest size the seats stay where they are, even if they still touch the controls.
  let clear = layoutWith(Math.min(MIN_CARD_SIZE, largest.cardSize), count, width, height);
  if (!clearOf(controls, clear, width, height)) {
    return clear;
  }
  let tooLarge = largest.cardSize;
  while (tooLarge - clear.cardSize > 0.001) {
    const middle = layoutWith((clear.cardSize + tooLarge) / 2, count, width, height);
    if (clearOf(controls, middle, width, height)) {
      clear = middle;
    } else {
      tooLarge = middle.cardSize;
    }
  }
  return clear;
}

function layoutWith(cardSize: number, count: number, width: number, height: number): SeatLayout {
  const side = Math.min(width, height);
  const inset = side * (SPACING + cardSize * SEAT_WIDTH / 2);
  const seats = pointsAroundStadium(count, width - 2 * inset, height - 2 * inset)
    .map(point => ({x: (inset + point.x) / width * 100, y: (inset + point.y) / height * 100}));
  return {cardSize, seatWidth: cardSize * SEAT_WIDTH, seats};
}

// Whether no seat comes closer than CONTROLS_GAP to the controls. A seat is as wide as seatWidth and as tall as the card
// with the nickname under it, centred on its point.
function clearOf(controls: Box, layout: SeatLayout, width: number, height: number): boolean {
  const side = Math.min(width, height);
  const cardHeight = layout.cardSize * side;
  const seatWidth = layout.seatWidth * side;
  const seatHeight = cardHeight * (1 + NICKNAME_GAP)
    + Math.max(NICKNAME_MIN_FONT, cardHeight * NICKNAME_SIZE) * NICKNAME_LINE_HEIGHT;
  return layout.seats.every(seat => {
    const x = seat.x / 100 * width;
    const y = seat.y / 100 * height;
    return x + seatWidth / 2 + CONTROLS_GAP <= controls.left || x - seatWidth / 2 - CONTROLS_GAP >= controls.right
      || y + seatHeight / 2 + CONTROLS_GAP <= controls.top || y - seatHeight / 2 - CONTROLS_GAP >= controls.bottom;
  });
}

export function stadiumPerimeter(width: number, height: number): number {
  return 2 * Math.abs(width - height) + Math.PI * Math.min(width, height);
}

// Points spread evenly along the edge of a stadium: the first one in the middle of the bottom edge, the others
// clockwise. Coordinates are relative to the top left corner of the stadium's bounding box, y grows downwards.
export function pointsAroundStadium(count: number, width: number, height: number): Point[] {
  const radius = Math.min(width, height) / 2;
  // One of the two is zero: the ends are rounded across the shorter side
  const straightX = width - 2 * radius;
  const straightY = height - 2 * radius;
  const quarterArc = Math.PI * radius / 2;
  const arc = (centerX: number, centerY: number, startAngle: number) => (distance: number): Point => ({
    x: centerX + radius * Math.cos(startAngle + distance / radius),
    y: centerY + radius * Math.sin(startAngle + distance / radius)
  });
  const edge: { length: number, pointAt: (distance: number) => Point }[] = [
    {length: straightX / 2, pointAt: distance => ({x: width / 2 - distance, y: height})},
    {length: quarterArc, pointAt: arc(radius, height - radius, Math.PI / 2)},
    {length: straightY, pointAt: distance => ({x: 0, y: height - radius - distance})},
    {length: quarterArc, pointAt: arc(radius, radius, Math.PI)},
    {length: straightX, pointAt: distance => ({x: radius + distance, y: 0})},
    {length: quarterArc, pointAt: arc(width - radius, radius, -Math.PI / 2)},
    {length: straightY, pointAt: distance => ({x: width, y: radius + distance})},
    {length: quarterArc, pointAt: arc(width - radius, height - radius, 0)},
    {length: straightX / 2, pointAt: distance => ({x: width - radius - distance, y: height})}
  ];
  const step = stadiumPerimeter(width, height) / count;
  return Array.from({length: count}, (_, index) => {
    let distance = index * step;
    let piece = 0;
    while (distance > edge[piece].length) {
      distance -= edge[piece++].length;
    }
    return edge[piece].pointAt(distance);
  });
}
