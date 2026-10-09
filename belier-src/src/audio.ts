/*
 * Ambiance de nuit, entièrement synthétisée : vent, grillons lointains, nappe d'accord très douce,
 * et des cloches cristallines quand on relie les étoiles.
 */
export class NightAudio {
  private ac: AudioContext | null = null;
  private master!: GainNode;
  private verb!: ConvolverNode;
  private timers: number[] = [];
  on = true;

  start() {
    if (this.ac) { void this.ac.resume(); return; }
    const ac = this.ac = new AudioContext();
    this.master = ac.createGain(); this.master.gain.value = 0; this.master.connect(ac.destination);
    this.master.gain.linearRampToValueAtTime(0.85, ac.currentTime + 4);
    // réverbération synthétique, longue (grand espace ouvert)
    this.verb = ac.createConvolver();
    const len = ac.sampleRate * 4.5, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.55; this.verb.connect(wet); wet.connect(this.master);

    // vent : bruit brun filtré, qui respire lentement
    const nb = ac.createBuffer(1, ac.sampleRate * 6, ac.sampleRate), nd = nb.getChannelData(0);
    let last = 0; for (let i = 0; i < nd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = last * 3.2; }
    const wind = ac.createBufferSource(); wind.buffer = nb; wind.loop = true;
    const wf = ac.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420; wf.Q.value = 0.6;
    const wg = ac.createGain(); wg.gain.value = 0.11;
    wind.connect(wf); wf.connect(wg); wg.connect(this.master); wind.start();
    this.lfo(0.04, 0.06, wg.gain); this.lfo(0.07, 160, wf.frequency);

    // nappe : quintes et neuvièmes très douces, désaccordées, qui ondulent
    const pad = ac.createGain(); pad.gain.value = 0.045; const pf = ac.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 900;
    pad.connect(pf); pf.connect(this.master); pf.connect(this.verb);
    [110, 164.81, 246.94, 329.63, 493.88].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 2) * 5;
      g.gain.value = 0.5 / (i + 1); o.connect(g); g.connect(pad); o.start(); this.lfo(0.02 + i * 0.013, 0.25 / (i + 1), g.gain);
    });

    // grillons, au loin, de temps en temps
    const cricket = () => {
      if (!this.ac) return;
      const t = ac.currentTime, pan = ac.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(this.master);
      for (let k = 0; k < 3 + Math.floor(Math.random() * 3); k++) {
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 4300 + Math.random() * 300;
        const s = t + k * 0.075; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.006, s + 0.012); g.gain.linearRampToValueAtTime(0, s + 0.05);
        o.connect(g); g.connect(pan); o.start(s); o.stop(s + 0.06);
      }
      this.timers.push(window.setTimeout(cricket, 900 + Math.random() * 3500));
    };
    this.timers.push(window.setTimeout(cricket, 2500));
  }

  private lfo(rate: number, depth: number, p: AudioParam) {
    const ac = this.ac!, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(p); o.start();
  }

  /** une cloche cristalline (synthèse additive inharmonique), envoyée dans la réverbération */
  bell(freq: number, vol = 0.12, at = 0) {
    if (!this.ac) return;
    const ac = this.ac, t = ac.currentTime + at;
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(([r, a]) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq * r;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2 / r ** 0.4);
      o.connect(g); g.connect(this.master); g.connect(this.verb); o.start(t); o.stop(t + 3.5);
    });
  }
  chord() { [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => this.bell(f, 0.07, i * 0.16)); }
  /** souffle doux (le bélier qui s'élance) */
  whoosh(dur = 2.4) {
    if (!this.ac) return;
    const ac = this.ac, t = ac.currentTime, b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); g.connect(this.verb); s.start(t);
  }
  toggle() {
    this.on = !this.on;
    if (this.ac) this.master.gain.setTargetAtTime(this.on ? 0.85 : 0, this.ac.currentTime, 0.3);
    return this.on;
  }
}
