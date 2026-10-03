import {tickHeartbeatInWorker} from "./worker-heartbeat";

describe("tickHeartbeatInWorker", () => {

  it("ticks the STOMP heartbeat from a worker until it is cleared", async () => {
    const stomp: any = {};
    expect(tickHeartbeatInWorker(stomp)).toBeTrue();
    let ticks = 0;

    const id = stomp.setInterval(10, () => ticks++);
    await new Promise(resolve => setTimeout(resolve, 200));
    stomp.clearInterval(id);
    const ticksWhenCleared = ticks;
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(ticksWhenCleared).toBeGreaterThan(2);
    expect(ticks).withContext("no ticks after clearing").toBeLessThanOrEqual(ticksWhenCleared + 1);
  });

  it("keeps the page timers when a worker can't be started", () => {
    const stomp: any = {setInterval: "page timers"};
    spyOn(window, "Worker").and.throwError("Workers are not allowed");

    expect(tickHeartbeatInWorker(stomp)).toBeFalse();
    expect(stomp.setInterval).toBe("page timers");
  });
});
