/**
 * Ethereal Ambient Pentatonic Synthesizer Engine
 * Pure sine celesta / wind chime synthesis with spatial delay feedback.
 * Produces serene, harmonious musical progressions for cascade chains.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.5;

    // Master nodes
    this.masterGain = null;
    this.delayNode = null;
    this.delayGain = null;
    this.lowpassFilter = null;

    // F Major / D Minor Pentatonic Scale (F, G, A, C, D) across 4 octaves
    // Warm, deeply consonant, soothing, and musically uplifting
    this.scale = [
      174.61, 196.00, 220.00, 261.63, 293.66, // F3, G3, A3, C4, D4
      349.23, 392.00, 440.00, 523.25, 587.33, // F4, G4, A4, C5, D5
      698.46, 783.99, 880.00, 1046.50, 1174.66, // F5, G5, A5, C6, D6
      1396.91, 1567.98, 1760.00, 2093.00, 2349.32  // F6, G6, A6, C7, D7
    ];
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Master Volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Warm Lowpass Filter (eliminates all harshness)
    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    this.lowpassFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
    this.lowpassFilter.connect(this.masterGain);

    // Ambient Delay Feedback Network (Ethereal wind chime / echo effect)
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.setValueAtTime(0.22, this.ctx.currentTime); // 220ms delay

    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.28, this.ctx.currentTime); // 28% feedback

    // Connect delay loop: Filter -> Delay -> DelayGain -> Filter
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.muted;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.muted && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Play a melodious, bell-like musical chime
   * @param {number} combo - The current chain count
   * @param {string} type - Particle type
   */
  playExplosionChime(combo = 1, type = 'standard') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Pick note from Pentatonic scale
    const noteIndex = (combo - 1) % this.scale.length;
    const freq = this.scale[noteIndex];

    // Voice Gain
    const voiceGain = this.ctx.createGain();
    voiceGain.connect(this.lowpassFilter);
    voiceGain.connect(this.delayNode);

    // 1. Pure Sine Carrier (Fundamental)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Envelope: Gentle 8ms attack, smooth 0.8s bell decay
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(0.35, now + 0.008);
    const decay = 0.55 + Math.min(0.35, combo * 0.02);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(voiceGain);
    osc.start(now);
    osc.stop(now + decay + 0.05);

    // 2. Soft Octave Harmonic for crystalline resonance
    const harmonicOsc = this.ctx.createOscillator();
    const harmonicGain = this.ctx.createGain();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(freq * 2, now);

    harmonicGain.gain.setValueAtTime(0.0001, now);
    harmonicGain.gain.linearRampToValueAtTime(0.12, now + 0.006);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + (decay * 0.6));

    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(voiceGain);

    harmonicOsc.start(now);
    harmonicOsc.stop(now + decay + 0.05);
  }

  /**
   * Sound for player initial trigger click
   */
  playSeedTrigger() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(349.23, now); // F4
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.12); // C5

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.lowpassFilter);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Victory sound: Serene upward pentatonic chord cascade
   */
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const chords = [349.23, 440.00, 523.25, 698.46, 880.00, 1046.50]; // F A C F A C
    chords.forEach((f, i) => {
      const now = this.ctx.currentTime + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.lowpassFilter);
      gain.connect(this.delayNode);

      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  /**
   * Defeat sound: Soft gentle descending chord
   */
  playDefeat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 440.00, 392.00, 349.23]; // C5, A4, G4, F4
    notes.forEach((f, i) => {
      const now = this.ctx.currentTime + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.lowpassFilter);

      osc.start(now);
      osc.stop(now + 0.5);
    });
  }
}

export const soundEngine = new SoundEngine();
