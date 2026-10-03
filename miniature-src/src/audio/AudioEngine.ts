import { Level } from '../core/types';

/**
 * Tout le son est synthétisé (aucun fichier) : bruits filtrés et quelques oscillateurs.
 *
 *   dehors  : pluie (bruit blanc filtré), vent (bruit brun + LFO), ville lointaine (grondement grave + voitures rares)
 *             → passe par un passe-bas « étouffement » qui se ferme quand on entre dans la goutte
 *   vivant  : ambiance sous-marine (bruit brun très grave) + petites bulles
 *   matière : drone doux (quintes légèrement désaccordées), un peu plus aérien pour l'atome
 *   piano   : quelques notes isolées, lentes, en la mineur — synthèse additive (partiels légèrement inharmoniques)
 *
 * Les navigateurs exigent un geste (clic, touche) avant de jouer : le son démarre sur le bouton « sound ».
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private outsideLP!: BiquadFilterNode;
  private bus: Record<'rain' | 'wind' | 'city' | 'water' | 'bubbles' | 'drone' | 'shimmer' | 'piano', GainNode> = {} as never;
  private verbIn!: GainNode;
  private level: Level = Level.Street;
  private timers: number[] = [];
  enabled = false;

  async toggle(): Promise<boolean> {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    this.enabled = !this.enabled;
    if (this.enabled) await ctx.resume();
    this.master.gain.setTargetAtTime(this.enabled ? 0.9 : 0, ctx.currentTime, 0.6);
    if (this.enabled) this.setLevel(this.level, true);
    return this.enabled;
  }

  /** Mélange cible de chaque échelle. Les fondus sont lents : on ne doit jamais entendre de coupure. */
  setLevel(level: Level, immediate = false) {
    this.level = level;
    if (!this.ctx) return;
    const t = this.ctx.currentTime, tc = immediate ? 0.3 : 1.6;
    const mix: Record<string, number> = { rain: 0, wind: 0, city: 0, water: 0, bubbles: 0, drone: 0, shimmer: 0, piano: 0.5 };
    let lp = 18000;
    switch (level) {
      case Level.Street: case Level.Return: Object.assign(mix, { rain: 0.6, wind: 0.2, city: 0.16, piano: 0.55 }); break;
      case Level.Droplet: Object.assign(mix, { rain: 0.32, wind: 0.12, city: 0.1, drone: 0.04 }); lp = 700; break;   // le monde s'étouffe
      case Level.Micro: Object.assign(mix, { rain: 0.06, water: 0.42, bubbles: 0.5, drone: 0.05 }); lp = 220; break;
      case Level.Molecule: Object.assign(mix, { water: 0.08, drone: 0.32, shimmer: 0.05 }); lp = 160; break;
      case Level.Atom: Object.assign(mix, { drone: 0.26, shimmer: 0.22, piano: 0.42 }); lp = 120; break;
    }
    for (const k of Object.keys(this.bus) as (keyof typeof this.bus)[]) this.bus[k].gain.setTargetAtTime(mix[k], t, tc);
    this.outsideLP.frequency.setTargetAtTime(lp, t, tc * 0.8);
  }

  private noise(kind: 'white' | 'brown', seconds = 4): AudioBufferSourceNode {
    const ctx = this.ctx!, len = ctx.sampleRate * seconds, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.start();
    return src;
  }

  /**
   * Crépitement : des impacts très courts placés au hasard dans un buffer bouclé (gouttes sur le trottoir, sur le parapluie).
   * Deux couches de longueurs différentes pour que la boucle ne s'entende pas.
   */
  private patter(seconds: number, perSecond: number, decayMs: number): AudioBufferSourceNode {
    const ctx = this.ctx!, sr = ctx.sampleRate, len = Math.floor(sr * seconds), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const n = Math.floor(seconds * perSecond), dec = (decayMs / 1000) * sr;
    for (let k = 0; k < n; k++) {
      const at = Math.floor(Math.random() * len), amp = Math.pow(Math.random(), 2.2) * 0.9;
      for (let i = 0; i < dec * 5; i++) d[(at + i) % len] += (Math.random() * 2 - 1) * amp * Math.exp(-i / dec);
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.start();
    return src;
  }

  /** Une note de piano : partiels inharmoniques, les aigus s'éteignent plus vite, marteau feutré (filtre qui se referme). */
  private pianoNote(midi: number, when: number, vel: number) {
    const ctx = this.ctx!, f0 = 440 * Math.pow(2, (midi - 69) / 12), B = 0.00035;
    const out = this.gain(0), lp = this.filter('lowpass', 900 + vel * 2600, 0.3), pan = ctx.createStereoPanner();
    pan.pan.value = (midi - 64) / 40 + (Math.random() - 0.5) * 0.3;
    lp.frequency.setValueAtTime(900 + vel * 2600, when); lp.frequency.exponentialRampToValueAtTime(380, when + 4);
    out.connect(lp); lp.connect(pan); pan.connect(this.bus.piano);
    const life = 7 - (midi - 48) * 0.06;
    for (let n = 1; n <= 7; n++) {
      const f = f0 * n * Math.sqrt(1 + B * n * n); if (f > 9000) break;
      const o = ctx.createOscillator(), g = this.gain(0);
      o.type = 'sine'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 3;
      const a = vel * 0.4 / Math.pow(n, 1.35), tail = life / (1 + (n - 1) * 0.7);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(a, when + 0.006);
      g.gain.exponentialRampToValueAtTime(a * 0.35, when + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, when + tail);
      o.connect(g); g.connect(out); o.start(when); o.stop(when + tail + 0.1);
    }
    out.gain.setValueAtTime(1, when);
  }

  /** Musique : quatre accords lents (la m, fa, do, sol), une ou deux notes à la fois, beaucoup de silence. */
  private music() {
    const chords = [[57, 60, 64, 69, 72, 76], [53, 57, 60, 65, 69, 72], [55, 60, 64, 67, 72, 76], [55, 59, 62, 67, 71, 74]];
    const bass = [45, 41, 48, 43];
    let bar = 0, step = 0;
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05, c = chords[bar % 4];
      const up = this.level === Level.Atom || this.level === Level.Molecule ? 12 : 0;   // plus on descend, plus c'est aérien
      if (step === 0 && Math.random() < 0.8) this.pianoNote(bass[bar % 4], t, 0.32);
      if (Math.random() < 0.75) {
        const note = c[2 + Math.floor(Math.random() * 4)] + up;
        this.pianoNote(note, t + (step === 0 ? 0.25 : 0), 0.25 + Math.random() * 0.2);
        if (Math.random() < 0.18) this.pianoNote(c[Math.floor(Math.random() * 3)] + 12 + up, t + 0.9 + Math.random() * 0.4, 0.18);
      }
      step++;
      if (step >= 3) { step = 0; bar++; }
      this.timers.push(window.setTimeout(tick, 2300 + Math.random() * 1700));
    };
    this.timers.push(window.setTimeout(tick, 1200));
  }

  private gain(v = 0, to?: AudioNode) { const g = this.ctx!.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
  private filter(type: BiquadFilterType, f: number, q = 0.7) { const b = this.ctx!.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  private lfo(rate: number, depth: number, target: AudioParam) { const o = this.ctx!.createOscillator(), g = this.gain(depth); o.frequency.value = rate; o.connect(g); g.connect(target); o.start(); }

  private build() {
    const ctx = this.ctx = new AudioContext();
    this.master = this.gain(0, ctx.destination);
    // une petite réverbération synthétique, partagée
    const verb = ctx.createConvolver(), ir = ctx.createBuffer(2, ctx.sampleRate * 3.2, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
    verb.buffer = ir;
    const wet = this.gain(0.32, this.master); verb.connect(wet);
    const out = this.gain(1, this.master); out.connect(verb);
    this.verbIn = this.gain(0.9); this.verbIn.connect(verb);

    // --- piano, hors du filtre d'étouffement, très réverbéré
    this.bus.piano = this.gain(0, this.master); this.bus.piano.connect(this.verbIn);
    this.music();

    // --- dehors, derrière le filtre d'étouffement
    this.outsideLP = this.filter('lowpass', 18000, 0.5); this.outsideLP.connect(out);
    this.bus.rain = this.gain(0, this.outsideLP);
    const rain = this.noise('white'), rh = this.filter('highpass', 900), rl = this.filter('lowpass', 7000), rainShimmer = this.gain(0.55);
    rain.connect(rh); rh.connect(rl); rl.connect(rainShimmer); rainShimmer.connect(this.bus.rain);
    this.lfo(0.13, 0.12, rainShimmer.gain);
    // gouttes sur le trottoir (fines, nombreuses) et sur le parapluie (plus rondes, plus graves)
    const street = this.patter(7.3, 260, 1.2), sh = this.filter('highpass', 2200), sg = this.gain(0.5);
    street.connect(sh); sh.connect(sg); sg.connect(this.bus.rain);
    const umb = this.patter(5.1, 38, 6), ub = this.filter('bandpass', 950, 1.4), ug = this.gain(0.9);
    umb.connect(ub); ub.connect(ug); ug.connect(this.bus.rain);
    this.bus.wind = this.gain(0, this.outsideLP);
    const wind = this.noise('brown'), wl = this.filter('lowpass', 380, 1.2), windG = this.gain(0.7);
    wind.connect(wl); wl.connect(windG); windG.connect(this.bus.wind);
    this.lfo(0.05, 0.4, windG.gain); this.lfo(0.08, 140, wl.frequency);
    this.bus.city = this.gain(0, this.outsideLP);
    const hum = this.noise('brown'), hl = this.filter('lowpass', 120, 0.5); hum.connect(hl); hl.connect(this.bus.city);
    // une voiture lointaine, de temps en temps
    const car = () => {
      if (!this.ctx) return;
      const t = ctx.currentTime, src = this.noise('brown', 6), bp = this.filter('bandpass', 260, 0.8), g = this.gain(0);
      src.connect(bp); bp.connect(g); g.connect(this.bus.city);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.8, t + 2.6); g.gain.linearRampToValueAtTime(0, t + 5.5);
      bp.frequency.setValueAtTime(200, t); bp.frequency.linearRampToValueAtTime(420, t + 2.6); bp.frequency.linearRampToValueAtTime(180, t + 5.5);
      src.stop(t + 6);
      this.timers.push(window.setTimeout(car, 14000 + Math.random() * 20000));
    };
    this.timers.push(window.setTimeout(car, 6000));

    // --- le vivant : sous l'eau
    this.bus.water = this.gain(0, out);
    const water = this.noise('brown'), wl2 = this.filter('lowpass', 260, 1.5); water.connect(wl2); wl2.connect(this.bus.water);
    this.lfo(0.07, 90, wl2.frequency);
    this.bus.bubbles = this.gain(0, out);
    const bubble = () => {
      if (!this.ctx) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = this.gain(0);
      o.type = 'sine'; const f = 380 + Math.random() * 700;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.09);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(this.bus.bubbles); o.start(t); o.stop(t + 0.2);
      this.timers.push(window.setTimeout(bubble, 500 + Math.random() * 2600));
    };
    this.timers.push(window.setTimeout(bubble, 1000));

    // --- la matière : drone doux, quintes légèrement désaccordées
    this.bus.drone = this.gain(0, out);
    const droneLP = this.filter('lowpass', 900, 0.4); droneLP.connect(this.bus.drone);
    [55, 82.4, 110.2, 164.8].forEach((f, i) => {
      const o = ctx.createOscillator(), g = this.gain(0.16 / (i + 1));
      o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
      o.connect(g); g.connect(droneLP); o.start(); this.lfo(0.03 + i * 0.017, 0.06 / (i + 1), g.gain);
    });
    this.bus.shimmer = this.gain(0, out);
    [659.3, 987.8, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator(), g = this.gain(0.025);
      o.type = 'sine'; o.frequency.value = f; o.detune.value = i * 3; o.connect(g); g.connect(this.bus.shimmer); o.start();
      this.lfo(0.05 + i * 0.03, 0.02, g.gain);
    });
  }

  dispose() { this.timers.forEach(clearTimeout); void this.ctx?.close(); this.ctx = null; }
}
