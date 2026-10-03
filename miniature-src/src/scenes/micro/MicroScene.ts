import * as THREE from 'three';
import gsap from 'gsap';
import { BaseScene } from '../BaseScene';
import { Level, type Direction, type Look, type SceneContext } from '../../core/types';
import { rng } from '../../utils/math';
import { softDisc } from '../../utils/textures';
import { translucentMaterial } from '../../shaders/translucent';
import { volvox, pennateDiatom, centricDiatom, paramecium, radiolarian, type Organism } from './Organisms';

/**
 * Échelle 2 : l'intérieur de la goutte. Un petit univers vivant, sans rien d'inquiétant :
 * des organismes translucides éclairés par l'arrière, une neige de particules, des rais de lumière.
 * Tout bouge très lentement ; la caméra tourne autour d'un centre.
 */
export class MicroScene extends BaseScene {
  readonly level = Level.Micro;
  readonly look: Look = { exposure: 1.0, bloom: 0.75, bloomThreshold: 0.35, tint: [0.96, 1.02, 1.02], vignette: 0.6, grain: 0.04 };
  readonly lines = ['A drop of water is not empty.', 'Entire ecosystems can exist in a space small enough to sit on your fingertip.'];
  readonly maskColor = new THREE.Color('#0c0e1d');   // on plonge dans une particule : le noir bleuté des molécules

  private orgs: Organism[] = [];
  private snow: THREE.Points;
  private snowU: Record<string, THREE.IUniform>;
  private rays: THREE.Mesh[] = [];
  private beacon: THREE.Sprite;                      // la petite particule vers laquelle on plongera
  private dive = { k: 0 };
  private elapsed = 0;

  constructor(ctx: SceneContext) {
    super(ctx, 42, 0.05, 200);
    const s = this.scene, R = rng(31), low = ctx.quality === 'low';
    s.background = new THREE.Color('#06121a');
    s.fog = new THREE.FogExp2('#07141c', 0.034);

    // rais de lumière venus de « là-haut » (la surface de la goutte)
    const rayTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!;
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(200,235,230,0.55)'); gr.addColorStop(1, 'rgba(200,235,230,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      const side = g.createLinearGradient(0, 0, 64, 0); side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = side; g.fillRect(0, 0, 64, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(R.range(2, 5), 46), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: R.range(0.05, 0.12), depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      m.position.set(R.range(-14, 14), 6, R.range(-14, 6)); m.rotation.set(0, R.range(0, Math.PI), R.range(-0.25, 0.25)); s.add(m); this.rays.push(m);
    }

    // neige marine : des milliers de particules, taille réelle dans le monde, qui dérivent
    const n = low ? 2500 : 6000, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([R.range(-30, 30), R.range(-18, 18), R.range(-30, 30)], i * 3); seed[i] = R.next(); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.snowU = { uTime: { value: 0 }, uMap: { value: softDisc() }, uScale: { value: window.innerHeight } };
    this.snow = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.snowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; uniform float uTime, uScale; varying float vA;
        void main(){ vec3 p = position; p.x += sin(uTime * 0.11 + aSeed * 40.0) * 0.6; p.y += sin(uTime * 0.07 + aSeed * 23.0) * 0.8 - uTime * 0.05 * (0.5 + aSeed);
          p.y = mod(p.y + 18.0, 36.0) - 18.0; p.z += cos(uTime * 0.09 + aSeed * 31.0) * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float size = (0.04 + aSeed * aSeed * 0.12);
          gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 28.0); vA = (0.25 + aSeed * 0.5) * smoothstep(60.0, 8.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA; void main(){ float m = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(0.78, 0.9, 0.88) * m * vA, m * vA); }`,
    }));
    this.snow.frustumCulled = false; s.add(this.snow);

    // les organismes
    const place = (o: Organism, r0: number, r1: number) => {
      const v = new THREE.Vector3(R.gauss(), R.gauss() * 0.6, R.gauss()).normalize().multiplyScalar(R.range(r0, r1));
      o.object.position.copy(v); s.add(o.object); this.orgs.push(o);
    };
    place(volvox(R, 2.6), 6, 10); place(volvox(R, 1.8), 9, 16); place(volvox(R, 2.2), 14, 22);
    for (let i = 0; i < (low ? 5 : 9); i++) place(pennateDiatom(R, R.range(1.6, 3.2)), 3, 18);
    for (let i = 0; i < (low ? 3 : 6); i++) place(centricDiatom(R, R.range(0.6, 1.2)), 4, 18);
    for (let i = 0; i < (low ? 2 : 4); i++) place(paramecium(R, R.range(2.4, 3.4)), 4, 14);
    for (let i = 0; i < 3; i++) place(radiolarian(R, R.range(0.5, 0.9)), 5, 16);
    // bactéries : une poussière de petits bâtonnets, instanciés
    const bn = low ? 150 : 320, bact = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.035, 0.16, 2, 6), translucentMaterial({ core: '#9fb8b0', rim: '#e0efe9', opacity: 1.2 }), bn), dm = new THREE.Object3D();
    for (let i = 0; i < bn; i++) { dm.position.set(R.range(-20, 20), R.range(-12, 12), R.range(-20, 20)); dm.rotation.set(R.next() * 6, R.next() * 6, R.next() * 6); dm.updateMatrix(); bact.setMatrixAt(i, dm.matrix); }
    s.add(bact);
    this.orgs.push({ object: bact, update: (_t, dt) => { bact.rotation.y += dt * 0.004; } });

    // la particule choisie : légèrement plus lumineuse, à mi-chemin entre la caméra et le centre
    this.beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc(), color: '#d9f0ee', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.beacon.scale.setScalar(0.18); s.add(this.beacon);

    this.orbit.radius = 14; this.orbit.pitch = 0.12; this.orbit.autoSpin = 0.018;
    this.orbit.hoverRange = [0.25, 0.12]; this.orbit.dragLimit = [Math.PI, 0.7];
  }

  private beaconTarget() {
    // toujours dans l'axe, un peu devant le centre : c'est elle qu'on voit grossir pendant la plongée
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.orbit.target).normalize();
    return this.orbit.target.clone().addScaledVector(dir, 3.2).add(new THREE.Vector3(0.35, 0.25, 0));
  }

  async enter(dir: Direction) {
    this.dive.k = dir > 0 ? 0 : 1;
    this.orbit.radius = dir > 0 ? 3 : 14;
    this.camera.fov = dir > 0 ? 70 : 18; this.camera.updateProjectionMatrix();
  }

  /** On arrive de la surface : le monde s'ouvre devant nous. */
  intro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir > 0) {
      tl.to(this.orbit, { radius: 14, duration: 3.6, ease: 'power3.out' }, 0);
      this.fovTo(tl, 42, 3.6, 'power2.out', 0);
    } else {
      tl.to(this.dive, { k: 0, duration: 3, ease: 'power3.out' }, 0);
      this.fovTo(tl, 42, 3, 'power2.out', 0);
    }
    return tl;
  }

  /** On choisit une particule et on plonge dedans, très vite mais sans à-coup. */
  outro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir > 0) {
      tl.to(this.dive, { k: 1, duration: 2.4, ease: 'power3.in' }, 0);
      this.fovTo(tl, 14, 2.4, 'power2.in', 0);
    } else {
      tl.to(this.orbit, { radius: 3, duration: 2, ease: 'power3.in' }, 0);
      this.fovTo(tl, 75, 2, 'power2.in', 0);
    }
    return tl;
  }

  update(dt: number, elapsed: number) {
    this.elapsed = elapsed;
    this.snowU.uTime.value = elapsed;
    this.orgs.forEach(o => o.update(elapsed, dt));
    this.rays.forEach((r, i) => { r.rotation.z = Math.sin(elapsed * 0.05 + i) * 0.2; (r.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.04 * Math.sin(elapsed * 0.13 + i * 2); });
    this.applyOrbit(dt);
    const b = this.beaconTarget();
    this.beacon.position.copy(b);
    this.beacon.scale.setScalar(0.18 + 0.03 * Math.sin(this.elapsed * 1.7));
    // plongée : la caméra quitte l'orbite et file vers la particule
    if (this.dive.k > 0) {
      const from = this.camera.position.clone();
      this.camera.position.lerpVectors(from, b.clone().add(new THREE.Vector3(0, 0, 0.02)), this.dive.k * 0.985);
      this.camera.lookAt(b);
    }
  }

  resize(w: number, h: number) { super.resize(w, h); this.snowU.uScale.value = h; }
}
