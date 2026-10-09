import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSculpture, buildDust, EYE_DIST, type Portrait } from './anamorphosis';
import './style.css';

/*
 * G.O.A.T. — anamorphose 3D. Le portrait n'existe que depuis un seul point de vue :
 * la caméra de référence, en (0, 0, EYE_DIST), regardant l'origine.
 * Pour changer d'image : remplacer source/faker.webp puis lancer `python tools/bake.py` (voir README).
 */

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(16, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.6; controls.enablePan = false;
controls.minDistance = 5.2; controls.maxDistance = 14;

const PERFECT = new THREE.Spherical(EYE_DIST, Math.PI / 2, 0);
const ABSTRACT = new THREE.Spherical(9.6, Math.PI / 2 - 0.32, 1.05);
camera.position.setFromSpherical(ABSTRACT); camera.lookAt(0, 0, 0);

/** Le champ de vision garantit que le portrait entier tient à l'écran depuis l'angle parfait (portrait comme paysage). */
let imgAspect = 0.62;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const half = Math.max(1.2, (1.2 * imgAspect + 0.12) / camera.aspect);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(half / EYE_DIST));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ------------------------------------------------------------------ transitions de caméra (Align / Reset) */
let tween: { from: THREE.Spherical; to: THREE.Spherical; t0: number; dur: number } | null = null;
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function flyTo(to: THREE.Spherical, dur = 2400) {
  // on purge l'inertie en cours pour qu'elle ne combatte pas le mouvement
  controls.enableDamping = false; controls.update(); controls.enableDamping = true;
  const from = new THREE.Spherical().setFromVector3(camera.position);
  const target = to.clone();
  // le plus court chemin autour de l'axe vertical
  while (target.theta - from.theta > Math.PI) target.theta -= Math.PI * 2;
  while (target.theta - from.theta < -Math.PI) target.theta += Math.PI * 2;
  tween = { from, to: target, t0: performance.now(), dur };
  controls.enabled = false;
}
document.getElementById('align')!.addEventListener('click', () => flyTo(PERFECT, 2600));
document.getElementById('reset')!.addEventListener('click', () => flyTo(ABSTRACT, 2000));

/* ------------------------------------------------------------------ chargement des fragments */
const caption = document.getElementById('caption')!;
fetch('./portrait.json').then(r => r.json()).then((p: Portrait) => {
  imgAspect = p.aspect; resize();
  scene.add(buildSculpture(p));
  scene.add(buildDust(mobile ? 160 : 320));
  document.getElementById('loading')!.classList.add('done');
});

/* ------------------------------------------------------------------ boucle */
const tmp = new THREE.Spherical();
function frame(now: number) {
  requestAnimationFrame(frame);
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k);
    tmp.set(
      THREE.MathUtils.lerp(tween.from.radius, tween.to.radius, e),
      THREE.MathUtils.lerp(tween.from.phi, tween.to.phi, e),
      THREE.MathUtils.lerp(tween.from.theta, tween.to.theta, e),
    );
    camera.position.setFromSpherical(tmp); camera.lookAt(0, 0, 0);
    if (k === 1) { tween = null; controls.enabled = true; controls.update(); }
  } else controls.update();

  // proximité de l'angle parfait (angle depuis l'axe + distance) : seule la légende réagit, jamais les fragments
  const len = camera.position.length(), ang = Math.acos(THREE.MathUtils.clamp(camera.position.z / len, -1, 1));
  const near = (1 - THREE.MathUtils.smoothstep(ang, 0.015, 0.09)) * (1 - THREE.MathUtils.smoothstep(Math.abs(len - EYE_DIST), 0.15, 1.2));
  caption.style.opacity = String(THREE.MathUtils.smoothstep(near, 0.75, 1));

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

(window as unknown as { goat: object }).goat = { camera, flyTo, PERFECT, ABSTRACT, renderer, scene };   // débogage
