import * as THREE from 'three';
import gsap from 'gsap';
import { BaseScene } from '../BaseScene';
import { Level, type Direction, type Look, type SceneContext } from '../../core/types';
import { rng } from '../../utils/math';
import { softDisc } from '../../utils/textures';

type Rng = ReturnType<typeof rng>;

/**
 * Densités de probabilité (forme hydrogénoïde, Z effectif ajusté pour la lisibilité) :
 *   1s : r² e^(-2Zr)            — une boule serrée autour du noyau
 *   2s : r² (2 - Zr)² e^(-Zr)   — une coquille, séparée de 1s par un nœud
 *   2p : r⁴ e^(-Zr) cos²θ       — deux lobes de part et d'autre d'un axe (px, py, pz)
 * On tire des points par rejet : le nuage EST la probabilité de présence, pas une orbite.
 */
function sampleOrbital(R: Rng, kind: '1s' | '2s' | '2p', axis: THREE.Vector3, n: number, out: number[]) {
  const Z = kind === '1s' ? 2.6 : kind === '2s' ? 1.25 : 1.05, rMax = kind === '1s' ? 3 : 11;
  const radial = (r: number) => kind === '1s' ? r * r * Math.exp(-2 * Z * r) : kind === '2s' ? r * r * (2 - Z * r) ** 2 * Math.exp(-Z * r) : r ** 4 * Math.exp(-Z * r);
  let peak = 0; for (let r = 0; r < rMax; r += 0.01) peak = Math.max(peak, radial(r));
  let made = 0;
  while (made < n) {
    const r = R.next() * rMax;
    if (R.next() * peak > radial(r)) continue;
    const d = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize();
    if (kind === '2p' && R.next() > d.dot(axis) ** 2) continue;
    out.push(d.x * r, d.y * r, d.z * r);
    made++;
  }
}

/**
 * Échelle 4 : l'atome d'oxygène. Un noyau minuscule et lumineux (8 protons, 8 neutrons),
 * des nuages électroniques qui scintillent (1s, 2s, 2p), et surtout beaucoup de vide.
 */
export class AtomScene extends BaseScene {
  readonly level = Level.Atom;
  readonly look: Look = { exposure: 1.1, bloom: 0.45, bloomThreshold: 0.75, tint: [1.0, 0.99, 1.03], vignette: 0.7, grain: 0.045 };
  readonly lines = ['Go small enough, and almost everything becomes empty space.', 'The person. The rain. The street. You.', 'Different arrangements of the same building blocks.'];
  readonly maskColor = new THREE.Color('#e9dfcc');

  private nucleus = new THREE.Group();
  private clouds: THREE.Points;
  private cloudU: Record<string, THREE.IUniform>;

  constructor(ctx: SceneContext) {
    super(ctx, 38, 0.01, 400);
    const s = this.scene, R = rng(51), low = ctx.quality === 'low';
    s.background = new THREE.Color('#03040a');

    // noyau : protons chauds, neutrons pâles, serrés
    const pMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.86, 0.5) }), nMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.84, 0.95) });
    const ball = new THREE.SphereGeometry(0.075, 14, 10);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(ball, i % 2 ? nMat : pMat);
      m.position.set(R.gauss(), R.gauss(), R.gauss()).normalize().multiplyScalar(Math.cbrt(R.next()) * 0.14);
      this.nucleus.add(m);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(), color: '#ffd9a6', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(1.6); this.nucleus.add(glow);
    // le halo est porté par des sprites doux (un bloom trop intense sur un point fait des carrés)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(), color: '#c9a77a', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(5.5); this.nucleus.add(halo);
    s.add(this.nucleus);

    // nuages électroniques de l'oxygène : 1s², 2s², 2p⁴
    const pos: number[] = [], col: number[] = [], seed: number[] = [];
    const k = low ? 0.5 : 1;
    const groups: [Parameters<typeof sampleOrbital>[1], THREE.Vector3, number, string][] = [
      ['1s', new THREE.Vector3(), 3500 * k, '#f3dcc0'],
      ['2s', new THREE.Vector3(), 9000 * k, '#9fb6e8'],
      ['2p', new THREE.Vector3(1, 0, 0), 7000 * k, '#b6a6e6'],
      ['2p', new THREE.Vector3(0, 1, 0), 7000 * k, '#8fc4d8'],
      ['2p', new THREE.Vector3(0, 0, 1), 7000 * k, '#a9b8f0'],
    ];
    for (const [kind, axis, n, c] of groups) {
      const before = pos.length / 3;
      sampleOrbital(R, kind, axis, Math.round(n), pos);
      const cc = new THREE.Color(c);
      for (let i = before; i < pos.length / 3; i++) { col.push(cc.r, cc.g, cc.b); seed.push(R.next()); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    this.cloudU = { uTime: { value: 0 }, uMap: { value: softDisc() }, uScale: { value: window.innerHeight } };
    this.clouds = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.cloudU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: `attribute float aSeed; uniform float uTime, uScale; varying vec3 vC; varying float vA;
        void main(){ vec3 p = position;
          // flou quantique : chaque point tremble autour de sa position, sans trajectoire
          p += vec3(sin(uTime * 2.1 + aSeed * 91.0), sin(uTime * 1.7 + aSeed * 57.0), sin(uTime * 2.4 + aSeed * 33.0)) * 0.035 * (0.5 + length(position) * 0.15);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(0.085 * uScale / -mv.z, 1.5, 18.0);
          vC = color; vA = (0.35 + 0.45 * sin(uTime * (0.8 + aSeed * 2.5) + aSeed * 40.0) * 0.5 + 0.22) * smoothstep(0.1, 1.2, -mv.z);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ float m = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vC * m * vA * 0.42, m * vA); }`,
    }));
    this.clouds.frustumCulled = false; s.add(this.clouds);

    // poussière très lointaine : le vide n'est pas tout à fait noir
    const dn = 600, dp = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) { const v = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize().multiplyScalar(R.range(40, 120)); dp.set([v.x, v.y, v.z], i * 3); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    s.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: softDisc(), size: 0.6, color: '#5c6a94', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })));

    this.orbit.radius = 17; this.orbit.pitch = 0.25; this.orbit.autoSpin = 0.035;
    this.orbit.hoverRange = [0.3, 0.15]; this.orbit.dragLimit = [Math.PI, 0.9];
  }

  async enter(dir: Direction) {
    this.orbit.radius = dir > 0 ? 0.45 : 40;
    this.camera.fov = dir > 0 ? 16 : 24; this.camera.updateProjectionMatrix();
  }

  /** On sort de la lumière du noyau et on recule dans un immense vide. */
  intro(dir: Direction) {
    const tl = gsap.timeline();
    tl.to(this.orbit, { radius: 17, duration: dir > 0 ? 4.2 : 3, ease: 'power3.out' }, 0);
    this.fovTo(tl, 38, dir > 0 ? 4.2 : 3, 'power2.out', 0);
    return tl;
  }

  outro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir > 0) return tl.to({}, { duration: 0.5 });
    tl.to(this.orbit, { radius: 60, duration: 1.6, ease: 'power3.in' }, 0);
    this.fovTo(tl, 70, 1.6, 'power2.in', 0);
    return tl;
  }

  update(dt: number, elapsed: number) {
    this.cloudU.uTime.value = elapsed;
    this.nucleus.rotation.x += dt * 0.11; this.nucleus.rotation.y += dt * 0.07;
    this.clouds.rotation.y += dt * 0.012;
    this.applyOrbit(dt);
  }

  resize(w: number, h: number) { super.resize(w, h); this.cloudU.uScale.value = h; }
}
