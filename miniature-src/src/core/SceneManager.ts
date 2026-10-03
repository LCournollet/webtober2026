import { Level, type ExperienceScene, type SceneContext } from './types';

type Factory = (ctx: SceneContext) => Promise<ExperienceScene>;

/**
 * Registre des échelles. Chaque scène est chargée à la demande (import dynamique = un chunk par scène),
 * puis gardée en mémoire : revenir en arrière est instantané. La dernière étape (« Return ») réutilise la rue.
 */
export class SceneManager {
  private factories: Record<number, Factory> = {
    [Level.Street]: async ctx => new (await import('../scenes/street/StreetScene')).StreetScene(ctx),
    [Level.Droplet]: async ctx => new (await import('../scenes/droplet/DropletScene')).DropletScene(ctx),
    [Level.Micro]: async ctx => new (await import('../scenes/micro/MicroScene')).MicroScene(ctx),
    [Level.Molecule]: async ctx => new (await import('../scenes/molecule/MoleculeScene')).MoleculeScene(ctx),
    [Level.Atom]: async ctx => new (await import('../scenes/atom/AtomScene')).AtomScene(ctx),
  };
  private cache = new Map<number, Promise<ExperienceScene>>();
  current: ExperienceScene | null = null;
  level: Level = Level.Street;

  constructor(private ctx: SceneContext) {}

  /** La rue sert aussi pour le retour. */
  private key(level: Level) { return level === Level.Return ? Level.Street : level; }

  get(level: Level): Promise<ExperienceScene> {
    const k = this.key(level);
    let p = this.cache.get(k);
    if (!p) { p = this.factories[k](this.ctx); this.cache.set(k, p); }
    return p;
  }

  /** Précharge l'échelle suivante pendant qu'on contemple la courante. */
  preload(level: Level) {
    if (level >= Level.Street && level <= Level.Atom) void this.get(level);
  }

  forEachLoaded(fn: (s: ExperienceScene) => void) {
    this.cache.forEach(p => void p.then(fn));
  }
}
