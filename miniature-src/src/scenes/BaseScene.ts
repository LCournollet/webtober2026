import * as THREE from 'three';
import gsap from 'gsap';
import type { Direction, ExperienceScene, Level, Look, SceneContext } from '../core/types';
import { clamp, damp } from '../utils/math';

/**
 * Socle commun : scène, caméra, petite orbite pilotée par la souris (parallaxe au survol, rotation au glisser),
 * libération mémoire. Les échelles concrètes décrivent seulement leur monde et leurs mouvements de caméra.
 */
export abstract class BaseScene implements ExperienceScene {
  abstract readonly level: Level;
  abstract readonly look: Look;
  abstract readonly lines: string[];
  abstract readonly maskColor: THREE.Color;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  /** orbite autour de `target` : angles courants (lissés) et cibles */
  protected orbit = {
    target: new THREE.Vector3(), radius: 10, yaw: 0, pitch: 0.1,
    hoverYaw: 0, hoverPitch: 0, dragYaw: 0, dragPitch: 0,
    hoverRange: [0.18, 0.08] as [number, number],   // parallaxe au survol
    dragLimit: [Math.PI, 0.6] as [number, number],    // rotation au glisser
    autoSpin: 0,
    enabled: true,
  };

  constructor(protected ctx: SceneContext, fov = 40, near = 0.05, far = 400) {
    this.camera = new THREE.PerspectiveCamera(fov, ctx.aspect(), near, far);
  }

  async enter(_dir: Direction) {}
  async exit(_dir: Direction) {}
  abstract outro(dir: Direction): gsap.core.Timeline;
  abstract intro(dir: Direction): gsap.core.Timeline;

  pointer(nx: number, ny: number, dragging: boolean, dx: number, dy: number) {
    const o = this.orbit;
    o.hoverYaw = nx * o.hoverRange[0];
    o.hoverPitch = ny * o.hoverRange[1];
    if (dragging) {
      o.dragYaw = clamp(o.dragYaw - dx * 0.004, -o.dragLimit[0], o.dragLimit[0]);
      o.dragPitch = clamp(o.dragPitch + dy * 0.003, -o.dragLimit[1], o.dragLimit[1]);
    }
  }

  /** place la caméra sur l'orbite (appelé par les scènes qui l'utilisent) */
  protected applyOrbit(dt: number) {
    const o = this.orbit;
    if (!o.enabled) return;
    o.yaw += o.autoSpin * dt;
    const yaw = o.yaw + o.dragYaw + (this._hy = damp(this._hy, o.hoverYaw, 2, dt));
    const pitch = clamp(o.pitch + o.dragPitch + (this._hp = damp(this._hp, o.hoverPitch, 2, dt)), -1.3, 1.3);
    this.camera.position.set(
      o.target.x + Math.sin(yaw) * Math.cos(pitch) * o.radius,
      o.target.y + Math.sin(pitch) * o.radius,
      o.target.z + Math.cos(yaw) * Math.cos(pitch) * o.radius,
    );
    this.camera.lookAt(o.target);
  }
  private _hy = 0;
  private _hp = 0;

  /** un tween de FOV qui met à jour la projection */
  protected fovTo(tl: gsap.core.Timeline, fov: number, duration: number, ease: string, at: number | string = 0) {
    tl.to(this.camera, { fov, duration, ease, onUpdate: () => this.camera.updateProjectionMatrix() }, at);
  }

  abstract update(dt: number, elapsed: number): void;

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.scene.traverse(obj => {
      const m = obj as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach(mat => mat.dispose());
    });
  }
}

/** Timeline vide d'une durée donnée (quand une échelle n'a pas de mouvement particulier). */
export const pause = (d: number) => gsap.timeline().to({}, { duration: d });
