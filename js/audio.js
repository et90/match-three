/**
 * Audio Synthesizer for Match 3 Game using Web Audio API.
 * Provides crisp, zero-dependency sound effects for gameplay actions.
 */

class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('match3_muted') === 'true';
    this.masterGain = null;
    this.isInitialized = false;

    // Pentatonic scale frequencies for cascade combos (Hz)
    this.scale = [
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00, // A5
      1046.50, // C6
      1174.66, // D6
      1318.51, // E6
      1567.98, // G6
      1760.00  // A6
    ];
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.isInitialized = true;
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('match3_muted', muted ? 'true' : 'false');
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.4, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // UI Click sound
  playClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Smooth swap whoosh
  playSwap() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Invalid swap bounce
  playInvalidSwap() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Match 3 chime with pitch scaling for combos
  playMatch(combo = 1) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const noteIndex = Math.min((combo - 1) % this.scale.length, this.scale.length - 1);
    const baseFreq = this.scale[noteIndex];

    // Primary bell tone
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, t);

    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    // Harmonic sparkle
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, t);

    gain2.gain.setValueAtTime(0.2, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.25);
  }

  // Super Match 4 laser row/column blast
  playLineClear() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Laser sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.28);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    // Resonant sub-boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(300, t);
    subOsc.frequency.exponentialRampToValueAtTime(60, t + 0.35);

    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    osc.start(t);
    subOsc.start(t);
    osc.stop(t + 0.32);
    subOsc.stop(t + 0.38);
  }

  // Golden backdrop break shatter sound
  playTileBreak() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.exponentialRampToValueAtTime(1567.98, t + 0.08); // G6

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Level Win Fanfare
  playLevelWin() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [
      { f: 523.25, d: 0.12, t: 0.0 },   // C5
      { f: 659.25, d: 0.12, t: 0.12 },  // E5
      { f: 783.99, d: 0.12, t: 0.24 },  // G5
      { f: 1046.50, d: 0.4, t: 0.36 }  // C6
    ];

    const startTime = this.ctx.currentTime + 0.05;

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, startTime + n.t);

      gain.gain.setValueAtTime(0.35, startTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime + n.t);
      osc.stop(startTime + n.t + n.d + 0.05);
    });
  }

  // Shuffle sound
  playShuffle() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + i * 150, t + i * 0.06);

      gain.gain.setValueAtTime(0.2, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.06 + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.09);
    }
  }
}

// Global Sound Instance
window.soundController = new SoundController();
