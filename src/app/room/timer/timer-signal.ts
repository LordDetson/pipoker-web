import {Injectable} from "@angular/core";

// Sounds when the discussion timer runs out: two short soft beeps made by the browser, so no sound file is downloaded
@Injectable({
  providedIn: "root"
})
export class TimerSignal {

  ring() {
    try {
      const audio = new AudioContext();
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
      setTimeout(() => audio.close(), 1000);
    } catch {
      // A browser without Web Audio shows the end of the time only
    }
  }
}
