import {SeatStorage} from "./seat-storage";
import {participant} from "../testing/test-data";

describe("SeatStorage", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("remembers the participant of every room separately", () => {
    SeatStorage.save("room-1", participant("Alex", true));
    SeatStorage.save("room-2", participant("Dmitry"));

    expect(SeatStorage.find("room-1")).toEqual(participant("Alex", true));
    expect(SeatStorage.find("room-2")).toEqual(participant("Dmitry"));

    SeatStorage.remove("room-1");

    expect(SeatStorage.find("room-1")).toBeUndefined();
    expect(SeatStorage.find("room-2")).toEqual(participant("Dmitry"));
  });

  it("ignores values it did not write", () => {
    sessionStorage.setItem("seat-room-1", "{broken");
    sessionStorage.setItem("seat-room-2", JSON.stringify({watcher: true}));

    expect(SeatStorage.find("room-1")).toBeUndefined();
    expect(SeatStorage.find("room-2")).toBeUndefined();
  });
});
