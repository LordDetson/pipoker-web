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

// A card on the table is this part of the table's smaller side tall, as long as the seats fit around the table
const CARD_SIZE = 0.2;
// A seat is this many card heights wide; it is not as tall, so the width decides how close to the edge it can sit
const SEAT_WIDTH = 1.5;
// The space between neighbouring seats and between a seat and the edge of the table, as a part of the smaller side
const SPACING = 0.03;

// Seats the given number of people evenly around a poker table of the given size: a stadium, as drawn by an element
// with fully rounded corners. The first seat is in the middle of the bottom edge, nearest to the deck, the others
// follow clockwise. When there are too many people for full-size seats, the seats get smaller.
export function seatLayout(count: number, width: number, height: number): SeatLayout {
  const side = Math.min(width, height);
  // The seats sit SPACING and half a seat in from the edge, so the way around through them is
  // 2 * |width - height| + PI * side * (1 - 2 * SPACING - SEAT_WIDTH * cardSize): the larger the cards, the shorter it is.
  // The largest cards that fit are those for which it holds exactly count seats with SPACING between them.
  const fittingCardSize = (2 * Math.abs(width - height) + Math.PI * side * (1 - 2 * SPACING) - count * side * SPACING)
    / (side * SEAT_WIDTH * (count + Math.PI));
  const cardSize = Math.min(CARD_SIZE, fittingCardSize);
  const inset = side * (SPACING + cardSize * SEAT_WIDTH / 2);
  const seats = pointsAroundStadium(count, width - 2 * inset, height - 2 * inset)
    .map(point => ({x: (inset + point.x) / width * 100, y: (inset + point.y) / height * 100}));
  return {cardSize, seatWidth: cardSize * SEAT_WIDTH, seats};
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
