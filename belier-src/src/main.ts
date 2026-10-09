import * as THREE from 'three';
import { dir, skyDome, starField } from './sky';
import { ARIES, EDGES } from './stars';
import { RAM_STROKES, RAM_EYE, RAM_LENGTH } from './ram';
import { NightAudio } from './audio';
import './style.css';

/*
 * Aries — une nuit claire. On relie les étoiles du Bélier ; la constellation complète,
 * le bélier à la toison d'or se dessine autour d'elles, puis bondit à travers le ciel.
 */

const $ = (id: string) => document.getElementById(id)!;
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const DPR = Math.min(devicePixelRatio, mobile ? 1.5 : 2);

/* ------------------------------------------------------------------ rendu WebGL : ciel + étoiles */
const renderer = new THREE.WebGLRenderer({ canvas: $('gl') as HTMLCanvasElement, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(DPR);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
const sky = skyDome(); scene.add(sky.mesh);
const stars = starField(mobile ? 4500 : 9000); scene.add(stars.points);

/* ------------------------------------------------------------------ calque 2D : tracés, bélier, étoiles filantes */
const fx = $('fx') as HTMLCanvasElement, g = fx.getContext('2d')!;
let W = 0, H = 0;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  fx.width = W * DPR; fx.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  sky.uniforms.uRes.value.set(W * DPR, H * DPR);
  stars.uniforms.uScale.value = DPR * (W / H < 1 ? 0.85 : 1);
}
addEventListener('resize', resize); resize();

/* ------------------------------------------------------------------ regard : on vise le Bélier ; on peut regarder autour (limité) */
const BASE = { ra: 2.45, dec: 21 };
/** cadrage : large pendant la recherche, serré sur le bélier une fois la constellation complète */
const view = { fov: 0, k: 0 };
const fovFor = (k: number) => (W / H < 1 ? THREE.MathUtils.lerp(70, 44, k) : THREE.MathUtils.lerp(46, 27, k));
const look = { yaw: 0, pitch: -30, vy: 0, vp: 0 };   // degrés ; au départ on regarde l'horizon
let intro: { t0: number } | null = null;
function applyLook() {
  // une fois le bélier apparu, la caméra glisse doucement vers le centre de son corps et resserre le cadre
  const ra = THREE.MathUtils.lerp(BASE.ra, 2.36, view.k), dec = THREE.MathUtils.lerp(BASE.dec, 21.2, view.k);
  const f = fovFor(view.k); if (Math.abs(f - camera.fov) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
  const d = dir(ra - look.yaw / 15, dec + look.pitch);
  camera.up.set(0, 1, 0); camera.position.set(0, 0, 0); camera.lookAt(d);
  // le paysage suit un peu le regard (parallaxe)
  ($('ridgeFar') as unknown as SVGGElement).setAttribute('transform', `translate(${(-look.yaw * 6).toFixed(1)} ${(look.pitch * 2).toFixed(1)})`);
  ($('ridgeNear') as unknown as SVGGElement).setAttribute('transform', `translate(${(-look.yaw * 11).toFixed(1)} ${(look.pitch * 3.5).toFixed(1)})`);
}
applyLook();

/* ------------------------------------------------------------------ paysage : crête proche avec sapins (générée) */
(() => {
  let s = 11; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let d = 'M-200 400 L-200 300 ';
  for (let x = -200; x <= 1800; x += 20) d += `L${x} ${(290 + Math.sin(x / 210) * 22 + Math.sin(x / 67 + 1) * 8 + R() * 4).toFixed(1)} `;
  d += 'L1800 400 Z';
  for (let i = 0; i < 46; i++) {
    const x = -150 + R() * 1900, base = 296 + Math.sin(x / 210) * 22 + Math.sin(x / 67 + 1) * 8, h = 40 + R() * (x < 300 || x > 1300 ? 120 : 55), w = h * 0.34;
    d += `M${x - w * 0.12} ${base + 4} `;
    const tiers = 6;
    for (let k = 0; k <= tiers; k++) { const y = base - (h * k) / tiers, ww = w * (1 - k / tiers); d += `L${(x - ww).toFixed(1)} ${(y + h / tiers * 0.35).toFixed(1)} L${(x - ww * 0.45).toFixed(1)} ${y.toFixed(1)} `; }
    d += `L${x} ${base - h - 6} `;
    for (let k = tiers; k >= 0; k--) { const y = base - (h * k) / tiers, ww = w * (1 - k / tiers); d += `L${(x + ww * 0.45).toFixed(1)} ${y.toFixed(1)} L${(x + ww).toFixed(1)} ${(y + h / tiers * 0.35).toFixed(1)} `; }
    d += `L${x + w * 0.12} ${base + 4} Z `;
  }
  $('nearPath').setAttribute('d', d);
})();

/* ------------------------------------------------------------------ étoiles du Bélier : projection, étiquettes */
const AR = ARIES.map(s => ({ ...s, v: dir(s.ra, s.dec).multiplyScalar(57), x: 0, y: 0, vis: false, pulse: 0 }));
const byId = Object.fromEntries(AR.map(s => [s.id!, s]));
const labels = AR.map(s => { const el = document.createElement('div'); el.className = 'lab'; el.innerHTML = `<b>${s.name}</b><small>${s.info}</small>`; $('labels').appendChild(el); return el; });
const tmp = new THREE.Vector3();
function project() {
  AR.forEach((s, i) => {
    tmp.copy(s.v).project(camera);
    s.vis = tmp.z < 1; s.x = (tmp.x * 0.5 + 0.5) * W; s.y = (-tmp.y * 0.5 + 0.5) * H;
    labels[i].style.left = s.x + 'px'; labels[i].style.top = s.y + 'px';
  });
}
const pickStar = (x: number, y: number, r = mobile ? 38 : 28) => AR.filter(s => s.vis).map(s => ({ s, d: Math.hypot(s.x - x, s.y - y) })).filter(o => o.d < r).sort((a, b) => a.d - b.d)[0]?.s;

/* ------------------------------------------------------------------ état du jeu */
const audio = new NightAudio();
const links = new Set<string>();
const keyOf = (a: string, b: string) => [a, b].sort().join('|');
const VALID = new Set(EDGES.map(([a, b]) => keyOf(a, b)));
const NOTE: Record<string, number> = { mesarthim: 659.25, sheratan: 783.99, hamal: 987.77, bharani: 1174.66 };
let drag: { from: typeof AR[number]; x: number; y: number; moved: boolean } | null = null;
let pending: typeof AR[number] | null = null;   // mode « toucher » : une étoile choisie, en attente de la suivante
let looking: { x: number; y: number } | null = null;
let hover: typeof AR[number] | undefined;
let fails: { a: [number, number]; b: [number, number]; t: number }[] = [];
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number };
let sparks: Spark[] = [];
let complete = false, ramT = -1, ramAlpha = 0, gallop = -1, idleSince = performance.now();
let lastProgressAt = performance.now();

function burst(x: number, y: number, n = 24, spread = 90) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = Math.random() * spread; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.6 + Math.random() * 0.9, size: 0.6 + Math.random() * 1.6 }); }
}
function tryLink(a: typeof AR[number], b: typeof AR[number]) {
  const k = keyOf(a.id!, b.id!);
  if (a === b) return;
  if (VALID.has(k) && !links.has(k)) {
    links.add(k); audio.bell(NOTE[b.id!], 0.13); b.pulse = 1; a.pulse = 1; burst(b.x, b.y, 30);
    lastProgressAt = performance.now();
    $('prog').textContent = `${links.size} / 3`;
    if (links.size === 3) finish();
  } else if (!links.has(k)) {
    fails.push({ a: [a.x, a.y], b: [b.x, b.y], t: performance.now() });
    audio.bell(220, 0.03);
  }
}
function finish() {
  complete = true;
  $('hint').classList.add('gone');
  setTimeout(() => audio.chord(), 300);
  AR.forEach(s => { s.pulse = 1.2; });
  labels.forEach((l, i) => setTimeout(() => l.classList.add('on'), 600 + i * 250));
  setTimeout(() => { ramT = 0; }, 1400);
  labels.forEach(l => l.classList.add('mini'));
  setTimeout(() => $('myth').classList.add('on'), 6200);
}
$('wake').addEventListener('click', () => { if (gallop >= 0 || ramT < 1) return; gallop = 0; audio.whoosh(3.2); ($('wake') as HTMLButtonElement).disabled = true; });
$('again').addEventListener('click', () => {
  links.clear(); complete = false; ramT = -1; ramAlpha = 0; gallop = -1;
  $('prog').textContent = '0 / 3'; $('hint').classList.remove('gone'); labels.forEach(l => l.classList.remove('mini')); $('myth').classList.remove('on'); labels.forEach(l => l.classList.remove('on'));
  ($('wake') as HTMLButtonElement).disabled = false; lastProgressAt = performance.now();
});
$('sound').addEventListener('click', () => { const on = audio.toggle(); $('sound').setAttribute('aria-pressed', String(on)); $('sound').textContent = on ? 'son' : 'muet'; });

/* ------------------------------------------------------------------ pointeur */
const gl = $('gl');
gl.addEventListener('pointerdown', e => {
  if (intro || $('intro').classList.contains('gone') === false) return;
  gl.setPointerCapture(e.pointerId); idleSince = performance.now();
  const s = pickStar(e.clientX, e.clientY);
  if (s && !complete) { drag = { from: s, x: e.clientX, y: e.clientY, moved: false }; audio.bell(NOTE[s.id!] / 2, 0.04); }
  else looking = { x: e.clientX, y: e.clientY };
});
gl.addEventListener('pointermove', e => {
  hover = complete ? undefined : pickStar(e.clientX, e.clientY);
  gl.style.cursor = hover ? 'pointer' : 'crosshair';
  if (hover) labels[AR.indexOf(hover)].classList.add('on');
  AR.forEach((s, i) => { if (s !== hover && !complete) labels[i].classList.remove('on'); });
  if (drag) { drag.x = e.clientX; drag.y = e.clientY; if (Math.hypot(drag.x - drag.from.x, drag.y - drag.from.y) > 12) drag.moved = true; }
  else if (looking) {
    const dx = e.clientX - looking.x, dy = e.clientY - looking.y; looking = { x: e.clientX, y: e.clientY };
    look.vy = -dx * 0.045; look.vp = dy * 0.045;
    look.yaw = THREE.MathUtils.clamp(look.yaw + look.vy, -40, 40); look.pitch = THREE.MathUtils.clamp(look.pitch + look.vp, -14, 26);
  }
});
gl.addEventListener('pointerup', e => {
  if (drag) {
    const target = pickStar(e.clientX, e.clientY);
    if (target && target !== drag.from) { tryLink(drag.from, target); pending = null; }
    else if (!drag.moved) {
      // toucher sans glisser : on mémorise l'étoile, la suivante touchée sera reliée
      if (pending && pending !== drag.from) { tryLink(pending, drag.from); pending = null; } else pending = drag.from;
    } else pending = null;
  }
  drag = null; looking = null;
});

/* ------------------------------------------------------------------ entrée */
$('enter').addEventListener('click', () => {
  audio.start();
  $('intro').classList.add('gone');
  document.body.classList.remove('look-down'); document.body.classList.add('in');
  intro = { t0: performance.now() };
});
document.body.classList.add('look-down');

/* ------------------------------------------------------------------ dessin du calque 2D */
const GOLD = '243, 214, 150';
function line(ax: number, ay: number, bx: number, by: number, a: number, w = 1.4) {
  g.strokeStyle = `rgba(${GOLD}, ${a * 0.18})`; g.lineWidth = w * 5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  g.strokeStyle = `rgba(${GOLD}, ${a * 0.9})`; g.lineWidth = w; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
}
let shooting: { x: number; y: number; vx: number; vy: number; t: number; dur: number } | null = null, nextShoot = performance.now() + 7000;

function ramFrame(off: { x: number; y: number; rot: number; sc: number }) {
  const A = byId.bharani, B = byId.hamal;
  const ux = B.x - A.x, uy = B.y - A.y, vx = uy, vy = -ux;
  const cx = A.x + ux * 0.55 + vx * -0.35, cy = A.y + uy * 0.55 + vy * -0.35;   // centre approximatif du corps
  const cr = Math.cos(off.rot), sr = Math.sin(off.rot);
  return (p: [number, number]) => {
    let x = A.x + ux * p[0] + vx * p[1] - cx, y = A.y + uy * p[0] + vy * p[1] - cy;
    [x, y] = [(x * cr - y * sr) * off.sc, (x * sr + y * cr) * off.sc];
    return [x + cx + off.x, y + cy + off.y] as [number, number];
  };
}

function drawRam(now: number, dt: number) {
  if (ramT < 0) return;
  ramT = Math.min(1, ramT + dt / 6.5);
  ramAlpha = Math.min(1, ramAlpha + dt * 0.6);
  // la course : un grand bond vers l'est, puis retour à sa place
  let off = { x: 0, y: 0, rot: 0, sc: 1 };
  if (gallop >= 0) {
    gallop += dt / 7.5;
    const k = Math.min(1, gallop), L = Math.hypot(byId.hamal.x - byId.bharani.x, byId.hamal.y - byId.bharani.y);
    const out = Math.sin(Math.PI * k);                       // aller-retour
    const hop = Math.abs(Math.sin(k * Math.PI * 5)) * (1 - Math.abs(2 * k - 1) * 0.3);  // bonds successifs
    off = { x: -out * L * 0.62, y: -out * L * 0.22 - hop * L * 0.16, rot: Math.sin(k * Math.PI * 10) * 0.06 - out * 0.05, sc: 1 + out * 0.12 };
    if (k >= 1) { gallop = -1; ($('wake') as HTMLButtonElement).disabled = false; }
  }
  const T = ramFrame(off);
  const budget = ramT * RAM_LENGTH;
  let used = 0;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  const shimmer = 0.85 + 0.15 * Math.sin(now / 900);
  for (const s of RAM_STROKES) {
    const n = Math.min(s.pts.length, Math.max(0, Math.floor(budget - used))); used += s.pts.length;
    if (n < 2) continue;
    const pts = s.pts.slice(0, n).map(T);
    const a = ramAlpha * (s.curl ? 0.55 : 0.85) * shimmer;
    for (const [w, al] of [[s.w * 6, 0.07], [s.w * 2.4, 0.16], [s.w, 0.9]] as [number, number][]) {
      g.strokeStyle = `rgba(${GOLD}, ${a * al})`; g.lineWidth = w;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
    // la pointe du tracé en cours laisse des étincelles
    if (n < s.pts.length && Math.random() < 0.8) { const [x, y] = pts[pts.length - 1]; sparks.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30 + 10, life: 0, max: 1.2, size: 1 + Math.random() }); }
    // pendant la course, la toison sème de la poussière d'or
    if (gallop >= 0 && Math.random() < 0.5) { const [x, y] = pts[Math.floor(Math.random() * pts.length)]; sparks.push({ x, y, vx: (Math.random() - 0.5) * 20 + 40, vy: 15 + Math.random() * 30, life: 0, max: 1.6, size: 0.8 + Math.random() * 1.4 }); }
  }
  if (ramT > 0.4) { const [x, y] = T(RAM_EYE); g.fillStyle = `rgba(${GOLD}, ${ramAlpha * 0.9})`; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  g.restore();
}

function draw(now: number, dt: number) {
  g.clearRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  // traits validés
  for (const k of links) { const [a, b] = k.split('|').map(id => byId[id]); line(a.x, a.y, b.x, b.y, complete ? 0.95 : 0.8, complete ? 1.6 : 1.3); }
  // trait en cours (glisser) ou en attente (toucher)
  const from = drag?.from ?? pending;
  if (from) {
    const tx = drag ? (hover ?? { x: drag.x }).x : from.x, ty = drag ? (hover ?? { y: drag.y }).y : from.y;
    if (drag) { g.setLineDash([4, 6]); line(from.x, from.y, tx, ty, 0.55, 1); g.setLineDash([]); }
    g.strokeStyle = `rgba(${GOLD}, .6)`; g.lineWidth = 1; g.beginPath(); g.arc(from.x, from.y, 14 + Math.sin(now / 200) * 2, 0, 7); g.stroke();
  }
  // traits refusés : ils se dissolvent
  fails = fails.filter(f => now - f.t < 700);
  for (const f of fails) { const k = 1 - (now - f.t) / 700; g.setLineDash([2, 8]); line(f.a[0], f.a[1], f.b[0], f.b[1], k * 0.5, 1); g.setLineDash([]); }
  // halo des étoiles du Bélier : discret, plus visible si on cherche longtemps
  const help = Math.min(1, Math.max(0, (now - lastProgressAt - 9000) / 6000));
  for (const s of AR) {
    if (!s.vis) continue;
    s.pulse = Math.max(0, s.pulse - dt * 0.8);
    const r = 9 + s.pulse * 9, a = (complete ? 0.12 : 0.07 + help * 0.22 + (s === hover ? 0.35 : 0)) + s.pulse * 0.16;
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.2);
    gr.addColorStop(0, `rgba(${GOLD}, ${a})`); gr.addColorStop(1, `rgba(${GOLD}, 0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, r * 2.2, 0, 7); g.fill();
    if (!complete && (s === hover || help > 0)) { g.strokeStyle = `rgba(${GOLD}, ${s === hover ? 0.6 : help * 0.3})`; g.lineWidth = 1; g.beginPath(); g.arc(s.x, s.y, 16 + Math.sin(now / 400 + s.ra * 9) * 2, 0, 7); g.stroke(); }
  }
  g.restore();
  drawRam(now, dt);
  // étincelles
  g.save(); g.globalCompositeOperation = 'lighter';
  sparks = sparks.filter(p => (p.life += dt) < p.max);
  for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy = p.vy * 0.97 + 6 * dt; const k = 1 - p.life / p.max; g.fillStyle = `rgba(255, 228, 170, ${k * 0.9})`; g.beginPath(); g.arc(p.x, p.y, p.size * k + 0.3, 0, 7); g.fill(); }
  // étoile filante
  if (!shooting && now > nextShoot) { const a = Math.PI * (0.62 + Math.random() * 0.2), v = 700 + Math.random() * 500; shooting = { x: W * (0.3 + Math.random() * 0.7), y: H * Math.random() * 0.35, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: 0.6 + Math.random() * 0.5 }; nextShoot = now + 6000 + Math.random() * 10000; }
  if (shooting) {
    shooting.t += dt; const k = shooting.t / shooting.dur, x = shooting.x + shooting.vx * shooting.t, y = shooting.y + shooting.vy * shooting.t;
    const tail = 0.12, gr = g.createLinearGradient(x, y, x - shooting.vx * tail, y - shooting.vy * tail);
    gr.addColorStop(0, `rgba(255, 250, 235, ${Math.sin(Math.PI * k) * 0.9})`); gr.addColorStop(1, 'rgba(255, 250, 235, 0)');
    g.strokeStyle = gr; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x - shooting.vx * tail, y - shooting.vy * tail); g.stroke();
    if (k >= 1) shooting = null;
  }
  g.restore();
}

/* ------------------------------------------------------------------ boucle */
let last = performance.now();
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(now, dt);
}
let simNow = 0;
function update(now: number, dt: number) {
  if (intro) {
    // on lève lentement les yeux de l'horizon vers le ciel
    const k = Math.min(1, (now - intro.t0) / 4600), e = 1 - Math.pow(1 - k, 3);
    look.pitch = -30 + 30 * e; if (k >= 1) intro = null;
  } else if (!looking) {
    // inertie après un regard, puis retour très doux vers le Bélier
    look.vy *= 0.92; look.vp *= 0.92;
    look.yaw = THREE.MathUtils.clamp(look.yaw + look.vy, -40, 40); look.pitch = THREE.MathUtils.clamp(look.pitch + look.vp, -14, 26);
    if (performance.now() - idleSince > 5000) { look.yaw *= 0.998; look.pitch *= 0.998; }
  }
  view.k += ((complete ? 1 : 0) - view.k) * Math.min(1, dt * 0.35);
  applyLook();
  sky.uniforms.uTime.value = now / 1000; stars.uniforms.uTime.value = now / 1000;
  renderer.render(scene, camera);
  project();
  draw(now, dt);
}
requestAnimationFrame(frame);

(window as unknown as { aries: object }).aries = {
  /** avance la simulation de `sec` secondes (pour vérifier sans attendre) */
  advance: (sec: number) => { simNow = simNow || performance.now(); for (let t = 0; t < sec; t += 1 / 30) { simNow += 1000 / 30; update(simNow, 1 / 30); } },
  get state() { return { ramT, gallop, complete, viewK: view.k }; },
  renderer, scene, camera, tryLink: (a: string, b: string) => tryLink(byId[a], byId[b]), look, AR, wake: () => $('wake').click() };   // débogage
