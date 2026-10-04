import {Injectable, OnDestroy} from "@angular/core";

// What a person does with the page that lets it play sound. A tap on a phone only counts when the finger is lifted.
const GESTURES = ["click", "touchend", "keydown"];

// Sounds when the discussion timer runs out: two short soft beeps made by the browser, so no sound file is downloaded.
// Browsers play sound only on a page the person has used. Safari, on the iPhone too, goes further: it lets a page
// start its sound only while handling a tap or a key, and the time runs out with nobody touching the page.
// So the sound is made ready at the person's first tap or key on the page, and the end of the timer uses it.
@Injectable({
  providedIn: "root"
})
export class TimerSignal implements OnDestroy {

  private audio: AudioContext | undefined;
  private readonly onGesture = () => this.allowSound();

  constructor() {
    GESTURES.forEach(gesture => document.addEventListener(gesture, this.onGesture, {capture: true, passive: true}));
  }

  ngOnDestroy() {
    this.stopListening();
    this.audio?.close();
  }

  ring() {
    try {
      const audio = this.audio ??= new AudioContext();
      // Allowed when the page has been used: in Chrome and Firefox after any tap, in Safari after allowSound
      audio.resume().catch(() => undefined);
      [0, 0.3].forEach(delay => {
        const start = audio.currentTime + delay;
        const tone = audio.createOscillator();
        const volume = audio.createGain();
        tone.frequency.value = 880;
        volume.gain.setValueAtTime(0.15, start);
        volume.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        tone.connect(volume).connect(audio.destination);
        tone.start(start);
        tone.stop(start + 0.2);
      });
    } catch {
      // A browser without Web Audio shows the end of the time only
    }
  }

  // Runs while the browser handles a tap or a key, the only time Safari lets the page start its sound. Older iPhones
  // also want something played then, so a moment of silence is.
  private allowSound() {
    try {
      const audio = this.audio ??= new AudioContext();
      const silence = audio.createBufferSource();
      silence.buffer = audio.createBuffer(1, 1, audio.sampleRate);
      silence.connect(audio.destination);
      silence.start();
      audio.resume().then(() => this.stopListening(), () => undefined);
    } catch {
      this.stopListening();
    }
  }

  private stopListening() {
    GESTURES.forEach(gesture => document.removeEventListener(gesture, this.onGesture, {capture: true}));
  }
}
