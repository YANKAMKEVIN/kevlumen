/** Ambiance et sons générés avec la Web Audio API (aucun fichier audio). */
import { persist, save } from './store';

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[48, 55, 59, 62, 64], [45, 52, 55, 60, 64], [41, 48, 52, 55, 57, 64], [43, 50, 55, 57, 62]];
const PENT = [72, 74, 76, 79, 81, 84, 86, 88];
const CRYSTAL = [76, 79, 81, 84, 86, 88, 91, 93];

interface Nodes {
  ctx: AudioContext;
  master: GainNode;
  rev: ConvolverNode;
  dry: GainNode;
  padBus: GainNode;
}

class Sound {
  /** Son activé (réglage sauvegardé). */
  on = save.settings.sound !== false;
  private n: Nodes | null = null;
  private chordI = 0;
  private nextChord = 0;
  private nextBell = 0;
  private timer = 0;

  get ctx(): AudioContext | null { return this.n ? this.n.ctx : null; }

  /** Crée le graphe audio au premier geste du joueur (exigence des navigateurs). */
  init(): void {
    if (this.n) { if (this.n.ctx.state === 'suspended') void this.n.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    let c: AudioContext;
    try { c = new AC(); } catch { return; }
    const master = c.createGain(); master.gain.value = this.on ? 0.9 : 0; master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(master);
    const rev = c.createConvolver();
    const len = c.sampleRate * 4.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = ir;
    const revG = c.createGain(); revG.gain.value = 0.55; rev.connect(revG); revG.connect(comp);
    const dry = c.createGain(); dry.gain.value = 0.7; dry.connect(comp);
    const padBus = c.createGain(); padBus.gain.value = 0.0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
    padBus.connect(lp); lp.connect(rev); lp.connect(dry);
    padBus.gain.linearRampToValueAtTime(0.16, c.currentTime + 4);
    this.n = { ctx: c, master, rev, dry, padBus };
    this.chordI = 0; this.nextChord = c.currentTime + 0.1; this.nextBell = c.currentTime + 3;
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  /** Onglet caché : on coupe le contexte audio (et son minuteur) ; il reprend au retour. */
  setHidden(hidden: boolean): void {
    if (!this.n) return;
    if (hidden) { void this.n.ctx.suspend(); window.clearInterval(this.timer); this.timer = 0; }
    else {
      void this.n.ctx.resume();
      if (!this.timer) this.timer = window.setInterval(() => this.tick(), 250);
    }
  }

  private tick(): void {
    const n = this.n;
    if (!n) return;
    const t = n.ctx.currentTime;
    if (t > this.nextChord - 0.2) { this.chord(CHORDS[this.chordI % 4], this.nextChord, 11); this.chordI++; this.nextChord += 9; }
    if (t > this.nextBell) { this.bell(mtof(PENT[(Math.random() * PENT.length) | 0]), 0.035, t + 0.05, 3.5); this.nextBell = t + 2.5 + Math.random() * 5; }
  }

  private chord(notes: number[], t0: number, dur: number): void {
    const n = this.n;
    if (!n) return;
    const c = n.ctx;
    for (const m of notes) {
      for (const [type, det, g] of [['sine', -5, .5], ['triangle', 6, .22], ['sine', 1200, .06]] as [OscillatorType, number, number][]) {
        const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(m); o.detune.value = det;
        const gn = c.createGain();
        gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g / notes.length, t0 + 3.5);
        gn.gain.setValueAtTime(g / notes.length, t0 + dur - 4.5); gn.gain.linearRampToValueAtTime(0, t0 + dur);
        o.connect(gn); gn.connect(n.padBus); o.start(t0); o.stop(t0 + dur + .1);
      }
    }
  }

  bell(f: number, vol: number, t = 0, dec = 2.4): void {
    const n = this.n;
    if (!n) return;
    const c = n.ctx;
    t = t || c.currentTime;
    const o = c.createOscillator(), m = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f; m.type = 'sine'; m.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + dec * .6);
    m.connect(mg); mg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dec);
    o.connect(g); g.connect(n.rev); g.connect(n.dry);
    o.start(t); m.start(t); o.stop(t + dec + .1); m.stop(t + dec + .1);
  }

  private blip(f1: number, f2: number, dur: number, vol: number, type: OscillatorType = 'sine'): void {
    const n = this.n;
    if (!n) return;
    const c = n.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(n.dry); g.connect(n.rev); o.start(t); o.stop(t + dur + .02);
  }

  rotate(): void { this.blip(1500, 900, .07, .06); this.blip(3000, 2400, .03, .02, 'triangle'); }
  pick(): void { this.blip(600, 900, .09, .07, 'triangle'); }
  place(): void { this.blip(260, 110, .16, .16); this.blip(1800, 1400, .05, .03, 'triangle'); }
  back(): void { this.blip(700, 400, .12, .06, 'triangle'); }
  hint(): void { this.bell(mtof(84), .06); }
  crystal(i: number): void { const m = CRYSTAL[i % CRYSTAL.length]; this.bell(mtof(m), .12, 0, 3.2); this.bell(mtof(m + 12), .03, 0, 2); }
  dark(): void { this.blip(110, 90, .5, .09, 'sawtooth'); }
  win(): void {
    const n = this.n;
    if (!n) return;
    const t = n.ctx.currentTime;
    [72, 76, 79, 83, 84, 88, 91, 96].forEach((m, i) => this.bell(mtof(m), .09, t + i * .11, 3.6));
  }

  /** Coupe ou remet le son, et l'enregistre dans les réglages. */
  toggle(): void {
    this.on = !this.on;
    save.settings.sound = this.on;
    persist();
    if (this.n) this.n.master.gain.setTargetAtTime(this.on ? 0.9 : 0, this.n.ctx.currentTime, .1);
  }
}

export const Snd = new Sound();
