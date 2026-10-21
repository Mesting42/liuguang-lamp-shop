export class SoundBus {
  constructor(settings) {
    this.settings = { ...settings };
    this.context = null;
    this.master = null;
    this.musicTimer = null;
    this.musicIndex = 0;
    this.unlocked = false;
  }

  async unlock() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    if (!this.context) {
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = 0.75;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.unlocked = true;
    if (this.settings.music) this.startMusic();
    return true;
  }

  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (!this.settings.music) this.stopMusic();
    else if (this.unlocked) this.startMusic();
  }

  tone(frequency, duration, volume = 0.22, wave = "sine", delay = 0) {
    if (!this.context || !this.master || !this.settings.sfx) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.003, volume * this.settings.volume), start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  play(name) {
    if (!this.unlocked) return;
    const cues = {
      swap: [[392, 0.11, 0.12]],
      match: [[523, 0.13, 0.20], [659, 0.17, 0.15, 0.07]],
      beam: [[523, 0.12, 0.19], [784, 0.24, 0.16, 0.06]],
      bomb: [[349, 0.18, 0.20, 0, "triangle"], [587, 0.22, 0.17, 0.08]],
      lens: [[659, 0.16, 0.17], [880, 0.22, 0.19, 0.08]],
      combo: [[392, 0.18, 0.21, 0, "triangle"], [587, 0.19, 0.17, 0.07], [784, 0.28, 0.16, 0.14]],
      cascade: [[587, 0.11, 0.14], [740, 0.16, 0.14, 0.07]],
      bonus: [[784, 0.13, 0.08], [988, 0.16, 0.045, 0.055]],
      "bonus-ready": [[523, 0.24, 0.12], [659, 0.27, 0.11, 0.07], [784, 0.36, 0.1, 0.14]],
      win: [[523, 0.22, 0.18], [659, 0.26, 0.18, 0.1], [784, 0.44, 0.17, 0.2]],
      fail: [[330, 0.24, 0.13], [294, 0.32, 0.12, 0.12]],
      repair: [[659, 0.16, 0.15], [880, 0.18, 0.17, 0.1], [1047, 0.26, 0.15, 0.19]]
    };
    (cues[name] || cues.match).forEach(([freq, time, volume, delay = 0, wave = "sine"]) => this.tone(freq, time, volume, wave, delay));
  }

  startMusic() {
    if (!this.context || !this.settings.music || this.musicTimer) return;
    const notes = [196, 247, 294, 247, 220, 262, 330, 262];
    const tick = () => {
      if (!this.settings.music || !this.context || this.context.state !== "running") return;
      const frequency = notes[this.musicIndex++ % notes.length];
      const start = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.002, 0.035 * this.settings.volume), start + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.5);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + 2.55);
    };
    tick();
    this.musicTimer = globalThis.setInterval(tick, 3100);
  }

  stopMusic() {
    if (this.musicTimer) globalThis.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
