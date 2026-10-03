import * as THREE from 'three';
import gsap from 'gsap';
import { BaseScene } from '../BaseScene';
import { Level, type Direction, type Look, type SceneContext } from '../../core/types';
import { rng } from '../../utils/math';
import { softDisc } from '../../utils/textures';

// unité : 1 = 1 ångström
const OH = 0.9584, ANGLE = THREE.MathUtils.degToRad(104.45);
const H1 = new THREE.Vector3(Math.sin(ANGLE / 2) * OH, -Math.cos(ANGLE / 2) * OH, 0);
const H2 = new THREE.Vector3(-Math.sin(ANGLE / 2) * OH, -Math.cos(ANGLE / 2) * OH, 0);

interface Mol { p: THREE.Vector3; q: THREE.Quaternion; v: THREE.Vector3; w: THREE.Vector3; ph: number }

/**
 * Échelle 3 : un paysage de molécules d'eau. Géométrie réelle (O–H 0,96 Å, angle 104,5°), mais rendu
 * de matière douce : atomes mats, nuage électronique flou autour de chaque oxygène, liaisons hydrogène
 * en pointillés qui naissent et meurent entre voisines. Au loin, des milliers de molécules dans la brume.
 */
export class MoleculeScene extends BaseScene {
  readonly level = Level.Molecule;
  readonly look: Look = { exposure: 1.05, bloom: 0.6, bloomThreshold: 0.55, tint: [0.98, 0.98, 1.04], vignette: 0.62, grain: 0.04 };
  readonly lines = ['H₂O.', 'Two hydrogen atoms. One oxygen atom.', 'A structure simple enough to write in three characters.', 'Yet without it, life as we know it could not exist.'];
  readonly maskColor = new THREE.Color('#efe2c8');   // on plonge dans un atome : sa lumière

  private mols: Mol[] = [];
  private O: THREE.InstancedMesh;
  private H: THREE.InstancedMesh;
  private B: THREE.InstancedMesh;
  private haze: THREE.Points;
  private hbonds: THREE.LineSegments;
  private hbondPos: Float32Array;
  private near = 0;            // nombre de molécules proches (on calcule leurs liaisons H)
  private chosen = 0;          // la molécule dans laquelle on plongera
  private dive = { k: 0 };
  private m4 = new THREE.Matrix4();
  private tmpQ = new THREE.Quaternion();
  private tmpV = new THREE.Vector3();

  constructor(ctx: SceneContext) {
    super(ctx, 40, 0.02, 300);
    const s = this.scene, R = rng(41), low = ctx.quality === 'low';
    s.background = new THREE.Color('#080a17');
    s.fog = new THREE.FogExp2('#080a17', 0.034);
    s.add(new THREE.HemisphereLight('#7f92c2', '#140f1c', 0.7));
    const key = new THREE.DirectionalLight('#ffd7a8', 1.3); key.position.set(6, 8, 5); s.add(key);
    const rim = new THREE.DirectionalLight('#7f9cff', 1.2); rim.position.set(-6, -2, -6); s.add(rim);

    // une grappe dense autour de la caméra, puis le paysage qui se perd au loin
    const nNear = low ? 60 : 90, nFar = low ? 600 : 1200;
    for (let i = 0; i < nNear + nFar; i++) {
      const far = i >= nNear;
      // le lointain est une coquille : rien entre la grappe et la caméra
      const p = far
        ? new THREE.Vector3(R.gauss(), R.gauss() * 0.6, R.gauss()).normalize().multiplyScalar(R.range(28, 75))
        : new THREE.Vector3(R.gauss() * 3.2, R.gauss() * 2.4, R.gauss() * 3.2);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R.next() * 6.3, R.next() * 6.3, R.next() * 6.3));
      this.mols.push({ p, q, v: new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).multiplyScalar(0.08), w: new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).multiplyScalar(0.25), ph: R.next() * 10 });
    }
    this.near = nNear;
    // écarter un peu les molécules proches pour qu'elles ne s'interpénètrent pas (~2,8 Å entre oxygènes)
    for (let it = 0; it < 6; it++) for (let i = 0; i < nNear; i++) for (let j = i + 1; j < nNear; j++) {
      const d = this.tmpV.subVectors(this.mols[i].p, this.mols[j].p), L = d.length();
      if (L < 2.8 && L > 1e-4) { d.multiplyScalar((2.8 - L) / L * 0.5); this.mols[i].p.add(d); this.mols[j].p.sub(d); }
    }
    const n = this.mols.length;
    // palette de la nuit : oxygène couleur de lampe, hydrogène gris-bleu
    const oMat = new THREE.MeshStandardMaterial({ color: '#a68a6a', roughness: 0.78, emissive: new THREE.Color('#2a1a0c') });
    const hMat = new THREE.MeshStandardMaterial({ color: '#9aa6bb', roughness: 0.7, emissive: new THREE.Color('#0c1220') });
    const bMat = new THREE.MeshStandardMaterial({ color: '#8f8a86', roughness: 0.6, emissive: new THREE.Color('#1a1614') });
    this.O = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.44, 3), oMat, n);
    this.H = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.27, 2), hMat, n * 2);
    const bondGeo = new THREE.CylinderGeometry(0.075, 0.075, 1, 8); bondGeo.translate(0, 0.5, 0);
    this.B = new THREE.InstancedMesh(bondGeo, bMat, n * 2);
    [this.O, this.H, this.B].forEach(m => { m.frustumCulled = false; s.add(m); });

    // nuage électronique : un halo flou centré sur chaque oxygène (plus dense du côté de l'oxygène, très électronégatif)
    const hp = new Float32Array(n * 3);
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
    this.haze = new THREE.Points(hg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uMap: { value: softDisc() }, uScale: { value: window.innerHeight } },
      vertexShader: `uniform float uScale; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(2.6 * uScale / -mv.z, 1.0, 400.0); vA = smoothstep(70.0, 4.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA; void main(){ float m = texture2D(uMap, gl_PointCoord).a; float a = m * m * 0.13 * vA; gl_FragColor = vec4(vec3(0.62, 0.72, 1.0) * a, a); }`,
    }));
    this.haze.frustumCulled = false; s.add(this.haze);

    // liaisons hydrogène (pointillés qui respirent)
    const maxH = 260;
    this.hbondPos = new Float32Array(maxH * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.hbondPos, 3));
    const lt = new Float32Array(maxH * 2); for (let i = 0; i < maxH; i++) { lt[i * 2] = 0; lt[i * 2 + 1] = 1; }
    lg.setAttribute('aT', new THREE.BufferAttribute(lt, 1));
    this.hbonds = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying float vT; void main(){ float dash = step(0.5, fract(vT * 5.0 - uTime * 0.4)); float a = dash * (0.25 + 0.15 * sin(uTime * 1.3)) * smoothstep(0.0, 0.15, vT) * smoothstep(1.0, 0.85, vT); gl_FragColor = vec4(vec3(0.6, 0.85, 1.0) * a, a); }`,
    }));
    this.hbonds.frustumCulled = false; s.add(this.hbonds);

    this.orbit.radius = 19; this.orbit.pitch = 0.15; this.orbit.autoSpin = 0.025;
    this.orbit.hoverRange = [0.25, 0.12]; this.orbit.dragLimit = [Math.PI, 0.7];
    this.writeInstances();
  }

  private writeInstances() {
    const n = this.mols.length, up = new THREE.Vector3(0, 1, 0), hp = this.haze.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      const m = this.mols[i];
      this.O.setMatrixAt(i, this.m4.compose(m.p, m.q, new THREE.Vector3(1, 1, 1)));
      [H1, H2].forEach((h, k) => {
        const hw = this.tmpV.copy(h).applyQuaternion(m.q).add(m.p);
        this.H.setMatrixAt(i * 2 + k, this.m4.compose(hw, m.q, new THREE.Vector3(1, 1, 1)));
        const dir = hw.clone().sub(m.p), len = dir.length();
        this.tmpQ.setFromUnitVectors(up, dir.normalize());
        this.B.setMatrixAt(i * 2 + k, this.m4.compose(m.p, this.tmpQ, new THREE.Vector3(1, len, 1)));
      });
      hp.setXYZ(i, m.p.x, m.p.y, m.p.z);
    }
    this.O.instanceMatrix.needsUpdate = this.H.instanceMatrix.needsUpdate = this.B.instanceMatrix.needsUpdate = true;
    hp.needsUpdate = true;
  }

  /** Liaisons hydrogène : un H d'une molécule près de l'O d'une autre (1,6 à 2,3 Å). */
  private writeHBonds() {
    let k = 0; const max = this.hbondPos.length / 6, hw = new THREE.Vector3();
    for (let i = 0; i < this.near && k < max; i++) {
      const a = this.mols[i];
      for (const h of [H1, H2]) {
        hw.copy(h).applyQuaternion(a.q).add(a.p);
        for (let j = 0; j < this.near && k < max; j++) {
          if (j === i) continue;
          const d = hw.distanceTo(this.mols[j].p);
          if (d > 1.5 && d < 2.6) { const o = this.mols[j].p; this.hbondPos.set([hw.x, hw.y, hw.z, o.x, o.y, o.z], k * 6); k++; break; }
        }
      }
    }
    this.hbonds.geometry.setDrawRange(0, k * 2);
    (this.hbonds.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private chooseMolecule() {
    // la molécule proche la mieux placée devant la caméra
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd);
    let best = 0, bestScore = -Infinity;
    for (let i = 0; i < this.near; i++) {
      const to = this.tmpV.subVectors(this.mols[i].p, this.camera.position), d = to.length();
      const score = to.normalize().dot(fwd) * 4 - Math.abs(d - 14) * 0.3;
      if (d > 2.5 && score > bestScore) { bestScore = score; best = i; }
    }
    this.chosen = best;
  }

  async enter(dir: Direction) {
    this.dive.k = dir > 0 ? 0 : 1;
    this.orbit.radius = dir > 0 ? 2.2 : 19;
    this.camera.fov = dir > 0 ? 24 : 14; this.camera.updateProjectionMatrix();
    if (dir < 0) this.chooseMolecule();
  }

  intro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir > 0) { tl.to(this.orbit, { radius: 19, duration: 3.6, ease: 'power3.out' }, 0); this.fovTo(tl, 40, 3.6, 'power2.out', 0); }
    else { tl.to(this.dive, { k: 0, duration: 3, ease: 'power3.out' }, 0); this.fovTo(tl, 40, 3, 'power2.out', 0); }
    return tl;
  }

  outro(dir: Direction) {
    const tl = gsap.timeline();
    if (dir > 0) {
      this.chooseMolecule();
      tl.to(this.dive, { k: 1, duration: 2.6, ease: 'power3.in' }, 0);
      this.fovTo(tl, 12, 2.6, 'power2.in', 0);
    } else {
      tl.to(this.orbit, { radius: 2.2, duration: 2, ease: 'power3.in' }, 0);
      this.fovTo(tl, 70, 2, 'power2.in', 0);
    }
    return tl;
  }

  update(dt: number, elapsed: number) {
    // agitation thermique : dérive lente, rotations ; les proches restent groupées
    for (let i = 0; i < this.mols.length; i++) {
      const m = this.mols[i];
      m.p.addScaledVector(m.v, Math.sin(elapsed * 0.4 + m.ph) * dt);
      if (i < this.near) m.p.multiplyScalar(1 - dt * 0.002);
      this.tmpQ.setFromEuler(new THREE.Euler(m.w.x * dt, m.w.y * dt, m.w.z * dt));
      m.q.multiply(this.tmpQ);
    }
    this.writeInstances();
    if (Math.floor(elapsed * 30) % 2 === 0) this.writeHBonds();
    (this.hbonds.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    this.applyOrbit(dt);
    if (this.dive.k > 0) {
      const target = this.mols[this.chosen].p, from = this.camera.position.clone();
      const toward = from.clone().sub(target).normalize().multiplyScalar(0.12).add(target);
      this.camera.position.lerpVectors(from, toward, this.dive.k);
      this.camera.lookAt(target);
    }
  }

  resize(w: number, h: number) { super.resize(w, h); (this.haze.material as THREE.ShaderMaterial).uniforms.uScale.value = h; }
}
