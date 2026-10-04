import {TimerSignal} from "./timer-signal";

// Records what the page does with the sound instead of playing it
class FakeAudioContext {
  static created: FakeAudioContext[] = [];
  static resumeAllowed = true;
  readonly currentTime = 0;
  readonly sampleRate = 44100;
  readonly destination = {};
  resumed = 0;
  tones = 0;
  silences = 0;
  closed = false;

  constructor() {
    FakeAudioContext.created.push(this);
  }

  resume(): Promise<void> {
    this.resumed++;
    return FakeAudioContext.resumeAllowed ? Promise.resolve() : Promise.reject(new DOMException("not allowed"));
  }

  close() {
    this.closed = true;
  }

  createOscillator() {
    const node = {frequency: {value: 0}, connect: (next: any) => next, start: () => this.tones++, stop: () => undefined};
    return node;
  }

  createGain() {
    return {gain: {setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined}, connect: (next: any) => next};
  }

  createBuffer() {
    return {};
  }

  createBufferSource() {
    return {buffer: null, connect: () => undefined, start: () => this.silences++};
  }
}

describe("TimerSignal", () => {
  let realAudioContext: typeof AudioContext;
  let signal: TimerSignal;

  beforeEach(() => {
    realAudioContext = window.AudioContext;
    (window as any).AudioContext = FakeAudioContext;
    FakeAudioContext.created = [];
    FakeAudioContext.resumeAllowed = true;
    signal = new TimerSignal();
  });

  afterEach(() => {
    signal.ngOnDestroy();
    (window as any).AudioContext = realAudioContext;
  });

  const tap = () => document.body.dispatchEvent(new Event("click", {bubbles: true}));
  const settle = () => new Promise(resolve => setTimeout(resolve));

  it("makes the sound ready at the first tap and rings with it later", async () => {
    tap();
    await settle();
    expect(FakeAudioContext.created.length).toBe(1);
    const audio = FakeAudioContext.created[0];
    expect(audio.silences).toBe(1);
    expect(audio.resumed).toBe(1);

    tap();
    signal.ring();

    expect(FakeAudioContext.created.length).toBe(1);
    expect(audio.silences).toBe(1);
    expect(audio.tones).toBe(2);
  });

  it("keeps asking at each tap while the browser doesn't allow the sound", async () => {
    FakeAudioContext.resumeAllowed = false;
    tap();
    await settle();
    FakeAudioContext.resumeAllowed = true;
    tap();
    await settle();
    tap();
    await settle();

    expect(FakeAudioContext.created.length).toBe(1);
    expect(FakeAudioContext.created[0].resumed).toBe(2);
  });

  it("rings on a page nobody has tapped, where the browser allows it", () => {
    signal.ring();

    expect(FakeAudioContext.created.length).toBe(1);
    expect(FakeAudioContext.created[0].tones).toBe(2);
  });

  it("shows the end of the time only in a browser without Web Audio", () => {
    (window as any).AudioContext = undefined;

    expect(() => signal.ring()).not.toThrow();
    tap();
  });
});
