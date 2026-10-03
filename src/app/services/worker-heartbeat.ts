// Browsers slow down the timers of a tab in the background, Chrome down to once a minute. The STOMP heartbeat
// would then stop, and the server would close the connection of someone who only switched to another tab,
// which takes them away from the table. Timers in a worker are not slowed down, so the heartbeat ticks there.
export function tickHeartbeatInWorker(stomp: any): boolean {
  let worker: Worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([TICKER], {type: "text/javascript"})));
  } catch (error) {
    // The heartbeat keeps the timers of the page
    return false;
  }
  const callbacks = new Map<number, () => void>();
  let nextId = 1;
  worker.onmessage = (event: MessageEvent<number>) => callbacks.get(event.data)?.();
  stomp.setInterval = (interval: number, callback: () => void): number => {
    const id = nextId++;
    callbacks.set(id, callback);
    worker.postMessage({id, interval});
    return id;
  };
  stomp.clearInterval = (id: number) => {
    callbacks.delete(id);
    worker.postMessage({id});
  };
  return true;
}

const TICKER = `
const timers = {};
onmessage = event => {
  const {id, interval} = event.data;
  if (interval) {
    timers[id] = setInterval(() => postMessage(id), interval);
  } else {
    clearInterval(timers[id]);
    delete timers[id];
  }
};
`;
