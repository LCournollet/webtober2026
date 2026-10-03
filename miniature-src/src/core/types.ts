import type * as THREE from 'three';

export enum Level { Street = 0, Droplet = 1, Micro = 2, Molecule = 3, Atom = 4, Return = 5 }
export const LEVEL_COUNT = 6;

/** +1 : on descend vers le plus petit · -1 : on remonte */
export type Direction = 1 | -1;

export type Quality = 'high' | 'low';

/** Réglages d'image propres à une échelle, appliqués par le Renderer quand la scène devient active. */
export interface Look {
  exposure: number;
  bloom: number;          // intensité du bloom
  bloomThreshold: number;
  tint: [number, number, number];   // étalonnage multiplicatif, en espace écran
  vignette: number;
  grain: number;
}

/** Ce que chaque échelle doit savoir faire. */
export interface ExperienceScene {
  readonly level: Level;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly look: Look;
  /** lignes de narration, affichées l'une après l'autre en arrivant */
  readonly lines: string[];
  /** couleur dans laquelle cette scène « se dissout » quand on la quitte vers le bas (masque de transition) */
  readonly maskColor: THREE.Color;

  /** prépare l'état (caméra, temps) avant d'être affichée */
  enter(dir: Direction): Promise<void>;
  /** libère ce qui doit l'être quand la scène n'est plus affichée (elle reste en mémoire) */
  exit(dir: Direction): Promise<void>;
  /** mouvement de caméra en partant : se termine quand l'écran est masqué par l'objet */
  outro(dir: Direction): gsap.core.Timeline;
  /** mouvement de caméra en arrivant, depuis le masque */
  intro(dir: Direction): gsap.core.Timeline;

  update(dt: number, elapsed: number): void;
  resize(width: number, height: number): void;
  pointer(nx: number, ny: number, dragging: boolean, dx: number, dy: number): void;
  dispose(): void;
}

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  quality: Quality;
  aspect: () => number;
}
