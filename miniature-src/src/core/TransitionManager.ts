import gsap from 'gsap';
import { Level, type Direction, type ExperienceScene } from './types';
import type { Renderer } from './Renderer';
import type { SceneManager } from './SceneManager';

export interface TransitionHooks {
  /** on quitte une échelle : la narration s'efface, le son commence à changer */
  leave(from: Level, to: Level): void;
  /** la nouvelle échelle est affichée (encore masquée) */
  swap(level: Level, scene: ExperienceScene): void;
  /** la caméra est arrivée : on peut raconter */
  arrive(level: Level, scene: ExperienceScene): void;
}

const wait = (tl: gsap.core.Timeline) => new Promise<void>(res => tl.eventCallback('onComplete', () => res()));

/**
 * Orchestration des changements d'échelle. Une transition descendante =
 *   outro de la scène A (travelling vers l'objet, le monde se floute, flou radial, fondu dans la couleur de l'objet)
 *   → bascule de scène pendant que l'écran est masqué
 *   → intro de la scène B (on « sort » de cette couleur, le flou retombe).
 * Les scènes ne s'occupent que de leur caméra ; l'image (flou, fondu, exposition) est animée ici.
 * Pendant une transition, toute nouvelle demande est ignorée.
 */
export class TransitionManager {
  busy = false;

  constructor(private renderer: Renderer, private scenes: SceneManager, private hooks: TransitionHooks) {}

  async go(target: Level): Promise<void> {
    const from = this.scenes.level;
    if (this.busy || target === from || target < Level.Street || target > Level.Return) return;
    this.busy = true;
    try {
      if (target === Level.Return) await this.ascentToStreet();
      else if (from === Level.Return && target === Level.Street) await this.settleStreet();
      else await this.step(from === Level.Return ? Level.Street : from, target, target > from ? 1 : -1);
    } finally {
      this.busy = false;
    }
    this.scenes.preload(target + 1);
  }

  /** Un pas d'échelle, dans un sens ou dans l'autre. */
  private async step(fromLevel: Level, to: Level, dir: Direction) {
    const a = this.scenes.current!, bPromise = this.scenes.get(to);
    const p = this.renderer.post;
    this.hooks.leave(fromLevel, to);
    const b = await bPromise;
    const mask = dir > 0 ? a.maskColor : b.maskColor;

    // --- sortie : la scène A bouge sa caméra, l'image se trouble et se remplit de la couleur de l'objet
    const out = a.outro(dir);
    const d = Math.max(0.6, out.duration());
    const post = gsap.timeline();
    post.set(p.fadeColor, { r: mask.r, g: mask.g, b: mask.b }, 0);
    post.to(p, { blur: 1, focus: dir > 0 ? 0.12 : 0.5, duration: d * 0.8, ease: 'sine.in' }, 0);
    post.to(p, { zoom: 0.9 * dir, chroma: 1, duration: d * 0.55, ease: 'expo.in' }, d * 0.45);
    post.to(p, { fade: 1, duration: d * 0.3, ease: 'power2.in' }, d * 0.7);
    if (dir > 0 && a.level === Level.Droplet) post.to(p, { exposure: 2.4, duration: d * 0.4, ease: 'power2.in' }, d * 0.6);   // on traverse la surface : éblouissement
    await Promise.all([wait(out), wait(post)]);

    // --- bascule, écran masqué
    await a.exit(dir);
    await b.enter(dir);
    this.renderer.show(b);
    this.scenes.current = b;
    this.scenes.level = to;
    this.hooks.swap(to, b);

    // --- entrée : on sort du masque
    const inn = b.intro(dir);
    const d2 = Math.max(0.8, inn.duration());
    const post2 = gsap.timeline();
    post2.set(p, { zoom: 0.7 * dir, blur: 1, chroma: 0.8 }, 0);
    post2.to(p, { fade: 0, duration: d2 * 0.45, ease: 'power2.out' }, 0);
    post2.to(p, { exposure: 1, duration: d2 * 0.6, ease: 'power2.out' }, 0);
    post2.to(p, { zoom: 0, chroma: 0, duration: d2 * 0.55, ease: 'expo.out' }, 0);
    post2.to(p, { blur: 0, focus: 0.35, duration: d2 * 0.9, ease: 'sine.out' }, 0.1);
    post2.call(() => this.hooks.arrive(to, b), [], d2 * 0.55);
    await Promise.all([wait(inn), wait(post2)]);
  }

  /**
   * Retour : remontée éclair atome → molécules → vivant → goutte → rue.
   * Chaque échelle n'apparaît qu'un instant, prise dans un flou radial qui s'ouvre (on recule à toute vitesse).
   */
  private async ascentToStreet() {
    const p = this.renderer.post;
    const atom = this.scenes.current!;
    this.hooks.leave(Level.Atom, Level.Return);
    const out = atom.outro(-1).timeScale(1.6);
    const t0 = gsap.timeline();
    t0.set(p.fadeColor, { r: 0.92, g: 0.88, b: 0.8 }, 0);
    t0.to(p, { zoom: -1.2, blur: 0.8, chroma: 1, duration: 0.6, ease: 'expo.in' }, 0);
    t0.to(p, { fade: 0.55, duration: 0.6, ease: 'power2.in' }, 0);
    await Promise.all([wait(out), wait(t0)]);
    await atom.exit(-1);

    // les échelles intermédiaires défilent
    for (const lvl of [Level.Molecule, Level.Micro, Level.Droplet]) {
      const s = await this.scenes.get(lvl);
      await s.enter(-1);
      this.renderer.show(s);
      this.scenes.current = s;
      const flash = gsap.timeline();
      const cam = s.intro(-1).timeScale(3.2);
      flash.set(p, { fade: 0.35, zoom: -1.1 }, 0);
      flash.to(p, { fade: 0.15, duration: 0.18 }, 0);
      flash.to(p, { fade: 0.6, duration: 0.16, ease: 'power2.in' }, 0.24);
      await wait(flash);
      cam.kill();
      await s.exit(-1);
    }

    // la rue, exactement comme au début ; le temps est encore suspendu
    const street = await this.scenes.get(Level.Return) as ExperienceScene & { prepareReturn(): void; finale(onLanded: () => void): void };
    street.prepareReturn();
    await street.enter(-1);
    this.renderer.show(street);
    this.scenes.current = street;
    this.scenes.level = Level.Return;
    this.hooks.swap(Level.Return, street);
    const settle = gsap.timeline();
    settle.set(p.fadeColor, { r: 0.02, g: 0.03, b: 0.05 }, 0);
    settle.to(p, { zoom: 0, chroma: 0, duration: 1.4, ease: 'expo.out' }, 0);
    settle.to(p, { fade: 0, duration: 1.2, ease: 'power2.out' }, 0);
    settle.to(p, { blur: 0, exposure: 1, duration: 2.2, ease: 'sine.out' }, 0);
    await wait(settle);
    // la goutte termine sa chute ; quelques secondes de silence, puis la dernière ligne
    await new Promise<void>(res => street.finale(() => res()));
    await new Promise(r => setTimeout(r, 2600));
    this.hooks.arrive(Level.Return, street);
  }

  /** Depuis la fin, remonter d'un cran : on est déjà dans la rue, seule la narration change. */
  private async settleStreet() {
    const s = this.scenes.current!;
    this.hooks.leave(Level.Return, Level.Street);
    this.scenes.level = Level.Street;
    await new Promise(r => setTimeout(r, 900));
    this.hooks.arrive(Level.Street, s);
  }

  /** Premier affichage : on sort du noir lentement. */
  async opening(first: ExperienceScene) {
    const p = this.renderer.post;
    p.fadeColor.set('#05070d');
    p.fade = 1; p.blur = 0.6;
    this.renderer.show(first);
    this.scenes.current = first;
    this.scenes.level = Level.Street;
    await first.enter(1);
    const tl = gsap.timeline();
    tl.to(p, { fade: 0, duration: 3.2, ease: 'sine.inOut' }, 0.2);
    tl.to(p, { blur: 0, duration: 4, ease: 'sine.out' }, 0.2);
    tl.call(() => this.hooks.arrive(Level.Street, first), [], 2.6);
    await wait(tl);
    this.scenes.preload(Level.Droplet);
  }
}

