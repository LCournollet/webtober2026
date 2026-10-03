import * as THREE from 'three';
import { Renderer } from './Renderer';
import { SceneManager } from './SceneManager';
import { TransitionManager } from './TransitionManager';
import { Input } from './Input';
import { Level, LEVEL_COUNT, type Quality } from './types';
import { Narration, Chrome } from '../ui/Narration';
import { AudioEngine } from '../audio/AudioEngine';

/** Choix de qualité au démarrage ; affiné ensuite en surveillant le temps par image. */
function guessQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || /Mobi|Android/i.test(navigator.userAgent);
  return weak ? 'low' : 'high';
}

/** le dernier mot, très discret, après quelques secondes de silence */
const FINAL_LINES = ['There is no such thing as ordinary.'];

export class Experience {
  readonly renderer: Renderer;
  readonly scenes: SceneManager;
  readonly transitions: TransitionManager;
  readonly narration = new Narration();
  readonly chrome = new Chrome(LEVEL_COUNT);
  readonly audio = new AudioEngine();
  private input: Input;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameTimes: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const quality = guessQuality();
    this.renderer = new Renderer(canvas, quality);
    this.scenes = new SceneManager({ renderer: this.renderer.gl, quality, aspect: () => window.innerWidth / window.innerHeight });
    this.transitions = new TransitionManager(this.renderer, this.scenes, {
      leave: () => { this.narration.clear(); this.chrome.hideHint(); },
      swap: (level) => { this.chrome.setLevel(level); this.audio.setLevel(level); },
      arrive: (level, scene) => {
        if (level === Level.Return) this.narration.show(FINAL_LINES, { delay: 0.2, gap: 3 });
        else this.narration.show(scene.lines);
        if (level === Level.Street) window.setTimeout(() => this.chrome.showHint(), 5200);
      },
    });
    this.input = new Input(canvas, dir => this.step(dir), () => this.transitions.busy);
    window.addEventListener('resize', () => this.resize());
    const soundBtn = document.getElementById('sound')!;
    soundBtn.addEventListener('click', async () => {
      const on = await this.audio.toggle();
      soundBtn.textContent = on ? 'sound · on' : 'sound · off';
      soundBtn.setAttribute('aria-pressed', String(on));
    });
  }

  /** Le scroll appelle simplement : niveau suivant / précédent. La timeline fait le reste. */
  goToLevel(level: Level) { void this.transitions.go(level); }

  private step(dir: 1 | -1) {
    const cur = this.scenes.level;
    if (cur === Level.Return && dir > 0) this.goToLevel(Level.Droplet);          // on peut refaire le voyage
    else this.goToLevel((cur + dir) as Level);
  }

  async start() {
    const street = await this.scenes.get(Level.Street);
    this.chrome.setLevel(Level.Street);
    this.resize();
    this.loop();
    this.chrome.liftCurtain();
    await this.transitions.opening(street);
  }

  private resize() {
    this.renderer.resize();
    this.scenes.forEachLoaded(s => s.resize(window.innerWidth, window.innerHeight));
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.elapsed += dt;
    const s = this.scenes.current;
    if (s) {
      const p = this.input.pointer, d = this.input.takeDrag();
      s.pointer(p.x, p.y, p.down, d.dx, d.dy);
      s.update(dt, this.elapsed);
    }
    this.renderer.render(this.elapsed);
    this.watchPerf(dt);
  };

  /** Si la machine peine (moyenne > 24 ms par image), on baisse la résolution, une fois de temps en temps. */
  private watchPerf(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 120) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 0.024) this.renderer.degrade();
  }
}
