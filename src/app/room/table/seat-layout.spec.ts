import {Point, pointsAroundStadium, seatLayout, stadiumPerimeter} from "./seat-layout";

describe("pointsAroundStadium", () => {

  function expectPoints(actual: Point[], expected: [number, number][]): void {
    expect(actual.length).toBe(expected.length);
    actual.forEach((point, index) => {
      expect(point.x).withContext("x of point " + index).toBeCloseTo(expected[index][0], 2);
      expect(point.y).withContext("y of point " + index).toBeCloseTo(expected[index][1], 2);
    });
  }

  it("starts in the middle of the bottom edge", () => {
    expectPoints(pointsAroundStadium(1, 300, 100), [[150, 100]]);
  });

  it("goes clockwise: along the bottom to the left, up the left end, along the top and down the right end", () => {
    expectPoints(pointsAroundStadium(4, 300, 100), [[150, 100], [0, 50], [150, 0], [300, 50]]);
  });

  it("keeps the same distance between neighbours along the straight edges and around the rounded ends", () => {
    // The edge is 2 * 200 + 100 * PI long, so every eighth of it ends 60.73 away from the end of a straight edge
    expectPoints(pointsAroundStadium(8, 300, 100), [
      [150, 100], [60.73, 100], [0, 50], [60.73, 0], [150, 0], [239.27, 0], [300, 50], [239.27, 100]
    ]);
  });

  it("rounds the top and the bottom of a table that is taller than wide", () => {
    expectPoints(pointsAroundStadium(4, 100, 300), [[50, 300], [0, 150], [50, 0], [100, 150]]);
  });

  it("walks around a round table", () => {
    expectPoints(pointsAroundStadium(4, 100, 100), [[50, 100], [0, 50], [50, 0], [100, 50]]);
  });

  it("has no points when nobody sits at the table", () => {
    expect(pointsAroundStadium(0, 300, 100)).toEqual([]);
  });
});

describe("seatLayout", () => {

  // The seats of the layout in pixels of a table of the given size
  function seatsInPixels(count: number, width: number, height: number): { x: number, y: number, width: number }[] {
    const layout = seatLayout(count, width, height);
    return layout.seats.map(seat => ({
      x: seat.x / 100 * width,
      y: seat.y / 100 * height,
      width: layout.seatWidth * Math.min(width, height)
    }));
  }

  it("seats a single person in the middle of the table's bottom, away from the edge", () => {
    const layout = seatLayout(1, 200, 100);

    expect(layout.seats.length).toBe(1);
    expect(layout.seats[0].x).toBeCloseTo(50, 5);
    expect(layout.seats[0].y).toBeGreaterThan(70);
    expect(layout.seats[0].y).toBeLessThan(90);
  });

  it("gives full-size cards to a usual team", () => {
    expect(seatLayout(8, 220, 100).cardSize).toBe(0.2);
    expect(seatLayout(8, 220, 100).seatWidth).toBeCloseTo(0.3, 5);
  });

  it("keeps every seat on the table", () => {
    for (const [width, height] of [[220, 100], [100, 160], [100, 100]]) {
      for (const seat of seatsInPixels(12, width, height)) {
        expect(seat.x - seat.width / 2).withContext(width + "x" + height).toBeGreaterThanOrEqual(0);
        expect(seat.x + seat.width / 2).withContext(width + "x" + height).toBeLessThanOrEqual(width);
        expect(seat.y - seat.width / 2).withContext(width + "x" + height).toBeGreaterThanOrEqual(0);
        expect(seat.y + seat.width / 2).withContext(width + "x" + height).toBeLessThanOrEqual(height);
      }
    }
  });

  it("makes the seats smaller when there are too many people for them to sit side by side", () => {
    const layout = seatLayout(30, 220, 100);
    const seats = seatsInPixels(30, 220, 100);

    expect(layout.cardSize).toBeLessThan(0.2);
    seats.forEach((seat, index) => {
      const next = seats[(index + 1) % seats.length];
      expect(Math.hypot(next.x - seat.x, next.y - seat.y)).withContext("seat " + index).toBeGreaterThanOrEqual(seat.width);
    });
  });

  it("makes the seats only as small as needed: a seat and the spacing take exactly their share of the way around", () => {
    for (const [count, width, height] of [[30, 220, 100], [20, 100, 100], [14, 100, 160]]) {
      const layout = seatLayout(count, width, height);
      const inset = 100 * (0.03 + layout.seatWidth / 2);

      expect(layout.cardSize).withContext(count + " at " + width + "x" + height).toBeLessThan(0.2);
      expect(stadiumPerimeter(width - 2 * inset, height - 2 * inset) / count)
        .withContext(count + " at " + width + "x" + height).toBeCloseTo((layout.seatWidth + 0.03) * 100, 5);
    }
  });

  // The seat at the top of a 358x325 table, like the one on a phone, comes down to the controls in its middle:
  // the button and the timer above it
  const controls = {left: 129, top: 92, right: 229, bottom: 233};

  function seatBoxes(count: number, width: number, height: number, layout = seatLayout(count, width, height, controls)) {
    const side = Math.min(width, height);
    const cardHeight = layout.cardSize * side;
    const seatHeight = cardHeight * 1.06 + Math.max(0.7 * 16, cardHeight * 0.17) * 1.2;
    return layout.seats.map(seat => ({
      left: seat.x / 100 * width - layout.seatWidth * side / 2,
      right: seat.x / 100 * width + layout.seatWidth * side / 2,
      top: seat.y / 100 * height - seatHeight / 2,
      bottom: seat.y / 100 * height + seatHeight / 2
    }));
  }

  it("keeps the seats clear of the controls in the middle of the table by making them smaller", () => {
    const covering = seatBoxes(6, 358, 325, seatLayout(6, 358, 325));
    expect(covering[3].bottom).withContext("the seat at the top without the controls").toBeGreaterThan(controls.top);

    const layout = seatLayout(6, 358, 325, controls);
    expect(layout.cardSize).toBeLessThan(0.2);
    expect(layout.cardSize).toBeGreaterThan(0.15);
    for (const seat of seatBoxes(6, 358, 325)) {
      const clear = seat.bottom <= controls.top || seat.top >= controls.bottom
        || seat.right <= controls.left || seat.left >= controls.right;
      expect(clear).withContext(JSON.stringify(seat)).toBeTrue();
    }
  });

  it("keeps full-size cards when the seats are clear of the controls anyway", () => {
    expect(seatLayout(6, 800, 400, {left: 340, top: 160, right: 460, bottom: 240})).toEqual(seatLayout(6, 800, 400));
  });

  it("makes the cards no smaller than half of the full size, even if the seats still touch the controls", () => {
    expect(seatLayout(6, 358, 325, {left: 0, top: 0, right: 358, bottom: 325}).cardSize).toBe(0.1);
  });

  it("has no seats at an empty table", () => {
    expect(seatLayout(0, 220, 100)).toEqual({cardSize: 0.2, seatWidth: 0.2 * 1.5, seats: []});
  });
});
