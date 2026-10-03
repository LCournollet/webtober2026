import { Level } from '../core/types';

/**
 * Tout le son est synthétisé (aucun fichier) : bruits filtrés et quelques oscillateurs.
 *
 *   dehors  : pluie (bruit blanc filtré), vent (bruit brun + LFO), ville lointaine (grondement grave + voitures rares)
 *             → passe par un passe-bas « étouffement » qui se ferme quand on entre dans la goutte
 *   vivant  : ambiance sous-marine (bruit brun très grave) + petites bulles
 *   matière : drone doux (quintes légèrement désaccordées), un peu plus aérien pour l'atome
 *
 * Les navigateurs exigent un geste (clic, touche) avant de jouer : le son démarre sur le bouton « sound ».
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private outsideLP!: BiquadFilterNode;
  private bus: Record<'rain' | 'wind' | 'city' | 'water' | 'bubbles' | 'drone' | 'shimmer', GainNode> = {} as never;
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
    const mix: Record<string, number> = { rain: 0, wind: 0, city: 0, water: 0, bubbles: 0, drone: 0, shimmer: 0 };
    let lp = 18000;
    switch (level) {
      case Level.Street: case Level.Return: Object.assign(mix, { rain: 0.5, wind: 0.22, city: 0.18 }); break;
      case Level.Droplet: Object.assign(mix, { rain: 0.32, wind: 0.12, city: 0.1, drone: 0.04 }); lp = 700; break;   // le monde s'étouffe
      case Level.Micro: Object.assign(mix, { rain: 0.06, water: 0.42, bubbles: 0.5, drone: 0.05 }); lp = 220; break;
      case Level.Molecule: Object.assign(mix, { water: 0.08, drone: 0.32, shimmer: 0.05 }); lp = 160; break;
      case Level.Atom: Object.assign(mix, { drone: 0.26, shimmer: 0.22 }); lp = 120; break;
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

    // --- dehors, derrière le filtre d'étouffement
    this.outsideLP = this.filter('lowpass', 18000, 0.5); this.outsideLP.connect(out);
    this.bus.rain = this.gain(0, this.outsideLP);
    const rain = this.noise('white'), rh = this.filter('highpass', 900), rl = this.filter('lowpass', 7000), rainShimmer = this.gain(0.55);
    rain.connect(rh); rh.connect(rl); rl.connect(rainShimmer); rainShimmer.connect(this.bus.rain);
    this.lfo(0.13, 0.12, rainShimmer.gain);
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
