/*
 * Dame Nature : une petite planète dont chaque sommet porte un climat (température, humidité, neige)
 * et une végétation. Pluie, soleil, vent et saisons pilotent l'écosystème ; forêts, rivières, banquise,
 * déserts et animaux en découlent.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
camera.position.set(0.4, 0.9, 4.4);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.06, enablePan: false, minDistance: 1.8, maxDistance: 9, rotateSpeed: 0.55, zoomSpeed: 0.7 });

/* ------------------------------------------------------------------ ciel, soleil */
{
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(80); pos.set([v.x, v.y, v.z], i * 3);
    const b = 0.35 + Math.random() ** 3 * 0.9, w = Math.random(); col.set([b * (0.85 + w * 0.15), b * 0.92, b * (1.1 - w * 0.2)], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true })));
}
function glowTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, s]) => gr.addColorStop(o, s)); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, 'rgba(255,250,235,1)'], [0.12, 'rgba(255,236,190,.95)'], [0.3, 'rgba(255,190,110,.25)'], [1, 'rgba(255,160,80,0)']]), blending: THREE.AdditiveBlending, depthWrite: false }));
sunSprite.scale.setScalar(9); scene.add(sunSprite);
const sunLight = new THREE.DirectionalLight(0xfff0d8, 3.2); scene.add(sunLight);
scene.add(new THREE.HemisphereLight(0x5a6c9a, 0x161a26, 0.55));

/* ------------------------------------------------------------------ planète */
const tilt = new THREE.Group(); scene.add(tilt);
const TILT = THREE.MathUtils.degToRad(23.4), SUN_DIR = new THREE.Vector3(-0.62, 0.28, 0.73).normalize(), SUN_AZ = Math.atan2(SUN_DIR.z, SUN_DIR.x);
const spin = new THREE.Group(); tilt.add(spin);

const SEED = Math.random() * 100;
const h3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + SEED) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), xf), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), xf), yf),
    l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), xf), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), xf), yf), zf);
}
const fbm = (x, y, z) => { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * vnoise(x, y, z); x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; } return v; };

let geo = new THREE.IcosahedronGeometry(1, 34); geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo, 1e-4);
const N = geo.attributes.position.count, P = geo.attributes.position.array.slice(), IDX = geo.index.array;
const nb = Array.from({ length: N }, () => new Set());
for (let i = 0; i < IDX.length; i += 3) { const [a, b, c] = [IDX[i], IDX[i + 1], IDX[i + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
const NB = nb.map(s => [...s]);
const dir = i => new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);

// relief : bruit fractal + une crête, niveau de la mer au 60e centile
const E = new Float32Array(N);
for (let i = 0; i < N; i++) { const x = P[i * 3] * 1.7, y = P[i * 3 + 1] * 1.7, z = P[i * 3 + 2] * 1.7; E[i] = fbm(x + 5, y, z) + 0.35 * (1 - Math.abs(fbm(x * 2 + 9, y * 2, z * 2) * 2 - 1)) * 0.5; }
const sorted = [...E].sort((a, b) => a - b), SEA = sorted[Math.floor(N * 0.6)], TOP = sorted[N - 1];
const land = new Uint8Array(N), el = new Float32Array(N), lat = new Float32Array(N);
for (let i = 0; i < N; i++) { land[i] = E[i] > SEA ? 1 : 0; el[i] = land[i] ? (E[i] - SEA) / (TOP - SEA) : 0; lat[i] = P[i * 3 + 1]; }
// distance à la côte (en sauts), pour l'humidité apportée par la mer
const coast = new Float32Array(N).fill(99); { let q = []; for (let i = 0; i < N; i++) if (!land[i]) { coast[i] = 0; q.push(i); }
  while (q.length) { const nq = []; for (const i of q) for (const j of NB[i]) if (coast[j] > coast[i] + 1) { coast[j] = coast[i] + 1; nq.push(j); } q = nq; } }
const shore = new Uint8Array(N); for (let i = 0; i < N; i++) if (!land[i]) shore[i] = NB[i].some(j => land[j]) ? 1 : 0;

// état du climat
const T = new Float32Array(N), M = new Float32Array(N), V = new Float32Array(N), S = new Float32Array(N), F = new Float32Array(N);
for (let i = 0; i < N; i++) { M[i] = land[i] ? 0.35 * Math.exp(-coast[i] / 4) + 0.15 : 1; V[i] = land[i] && Math.random() < 0.08 && Math.abs(lat[i]) < 0.6 ? 0.4 : 0; }

const posAttr = geo.attributes.position, colAttr = new THREE.BufferAttribute(new Float32Array(N * 3), 3);
geo.setAttribute('color', colAttr);
const planet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 }));
spin.add(planet);
const water = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ color: 0x1b5c8c, roughness: 0.16, metalness: 0.05, transparent: true, opacity: 0.86 }));
spin.add(water);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.13, 64, 48), new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) }, uTint: { value: new THREE.Color(0x5fa8ff) } },
  vertexShader: `varying vec3 vN; varying vec3 vP; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uSun; uniform vec3 uTint; varying vec3 vN; varying vec3 vP;
    void main() { vec3 V = normalize(cameraPosition - vP); float k = clamp(-dot(vN, V) / 0.48, 0.0, 1.0); float g = pow(k, 2.2) * (1.0 - smoothstep(0.92, 1.0, k) * 0.0);
      float lit = smoothstep(-0.35, 0.6, dot(vN, uSun)); gl_FragColor = vec4(uTint * g * (0.15 + 1.1 * lit), 1.0); }`,
}));
scene.add(atmo);

/* ------------------------------------------------------------------ rivières (lits précalculés, en eau selon l'humidité) */
const rivers = [];
{
  const used = new Uint8Array(N), src = [...Array(N).keys()].filter(i => land[i] && el[i] > 0.35).sort(() => Math.random() - 0.5);
  for (const s of src) {
    if (rivers.length > 34 || used[s] || NB[s].some(j => used[j])) continue;
    const path = [s]; let c = s;
    for (let k = 0; k < 60 && land[c]; k++) { let best = -1, be = E[c]; for (const j of NB[c]) if (E[j] < be) { be = E[j]; best = j; } if (best < 0) break; path.push(best); c = best; }
    if (path.length >= 4 && !land[path[path.length - 1]]) { rivers.push(path); path.forEach(i => (used[i] = 1)); }
  }
}
const segCount = rivers.reduce((s, p) => s + p.length - 1, 0);
const rivGeo = new THREE.BufferGeometry(), rivPos = new Float32Array(segCount * 6), rivCol = new Float32Array(segCount * 6);
const rivNodes = new Int32Array(segCount * 2);
{ let k = 0; for (const p of rivers) for (let i = 0; i < p.length - 1; i++) { rivNodes[k * 2] = p[i]; rivNodes[k * 2 + 1] = p[i + 1]; k++; } }
rivGeo.setAttribute('position', new THREE.BufferAttribute(rivPos, 3)); rivGeo.setAttribute('color', new THREE.BufferAttribute(rivCol, 3));
spin.add(new THREE.LineSegments(rivGeo, new THREE.LineBasicMaterial({ vertexColors: true })));

/* ------------------------------------------------------------------ arbres */
const treeGeo = new THREE.ConeGeometry(0.009, 0.034, 5).translate(0, 0.017, 0);
const slots = []; for (let i = 0; i < N; i++) if (land[i] && el[i] < 0.8) slots.push({ i, j: new THREE.Vector3((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.02), s: 0.7 + Math.random() * 0.6 });
const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85 }), slots.length);
trees.instanceMatrix.setUsage(THREE.DynamicDrawUsage); spin.add(trees);
const UP = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
slots.forEach(sl => { const d = dir(sl.i); sl.q = new THREE.Quaternion().setFromUnitVectors(UP, d); sl.p = d.clone().add(sl.j.clone().applyQuaternion(sl.q)).normalize(); });

/* ------------------------------------------------------------------ nuages et pluie */
const CL = 52, PUFF = 5, cloudG = new THREE.Group(); tilt.add(cloudG);
const clouds = Array.from({ length: CL }, (_, k) => {
  const d = new THREE.Vector3().randomDirection(); d.y *= 0.8; d.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  return { d, q, a: 0, order: Math.random(), puffs: Array.from({ length: PUFF }, (_, p) => ({ o: new THREE.Vector3((p - 2) * 0.03 + (Math.random() - 0.5) * 0.02, (Math.random() - 0.3) * 0.012, (Math.random() - 0.5) * 0.035), s: 0.018 + Math.random() * 0.02 * (p === 2 ? 1.6 : 1) })) };
});
const cloudMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a4250, flatShading: true, transparent: true, opacity: 0.9 }), CL * PUFF);
cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cloudG.add(cloudMesh);
const RN = 900, rainPos = new Float32Array(RN * 3), drops = Array.from({ length: RN }, () => ({ c: 0, r: 1.1 + Math.random() * 0.02, o: new THREE.Vector3() }));
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.PointsMaterial({ color: 0xa8d8ff, size: 0.008, transparent: true, opacity: 0, depthWrite: false });
cloudG.add(new THREE.Points(rainGeo, rainMat));

/* ------------------------------------------------------------------ animaux */
const DEER = 90, deerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.009, 0.007).translate(0, 0.006, 0), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.8 }), DEER);
deerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); spin.add(deerMesh);
let herd = [];
const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, -0.012, 0.004, -0.005, -0.003, 0, 0, 0, 0, 0, 0.012, 0.004, -0.005, 0.003, 0, 0]), 3)); wingGeo.computeVertexNormals();
const BIRDS = 4 * 9, birdMesh = new THREE.InstancedMesh(wingGeo, new THREE.MeshBasicMaterial({ color: 0x1a1e24, side: THREE.DoubleSide }), BIRDS);
birdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); tilt.add(birdMesh);
const flocks = Array.from({ length: 4 }, () => ({ axis: new THREE.Vector3().randomDirection(), ph: Math.random() * 6, sp: 0.18 + Math.random() * 0.12, vis: 0 }));
// souffles de baleines et étincelles de la main de Dame Nature
const FX = 400, fxPos = new Float32Array(FX * 3), fxCol = new Float32Array(FX * 3), fx = [];
const fxGeo = new THREE.BufferGeometry(); fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3)); fxGeo.setAttribute('color', new THREE.BufferAttribute(fxCol, 3));
spin.add(new THREE.Points(fxGeo, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
function burst(p, n, color, speed, life) { for (let k = 0; k < n; k++) fx.push({ p: p.clone(), v: new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.3 + Math.random())).add(p.clone().normalize().multiplyScalar(speed)), c: new THREE.Color(color), t: 0, life: life * (0.6 + Math.random() * 0.6) }); if (fx.length > FX) fx.splice(0, fx.length - FX); }

/* ------------------------------------------------------------------ réglages */
const ctl = { rain: 0.5, sun: 0.6, wind: 0.4 }; let speed = 1, year = Math.PI / 2, years = 0;
function bindSlider(id, key, fmt) { const el = $(id), out = $('v' + id[0].toUpperCase() + id.slice(1)); const up = () => { ctl[key] = el.value / 100; out.textContent = fmt(ctl[key]); }; el.addEventListener('input', up); up(); return v => { el.value = v; up(); }; }
const setRain = bindSlider('rain', 'rain', v => ['sec', 'bruine', 'averses', 'pluvieux', 'déluge'][Math.min(4, Math.floor(v * 5))]);
const setSun = bindSlider('sun', 'sun', v => ['glacial', 'frais', 'doux', 'chaud', 'brûlant'][Math.min(4, Math.floor(v * 5))]);
const setWind = bindSlider('wind', 'wind', v => ['calme', 'brise', 'vent', 'rafales', 'tempête'][Math.min(4, Math.floor(v * 5))]);
document.querySelectorAll('#speed button').forEach(b => b.addEventListener('click', () => { speed = +b.dataset.s; document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', x === b)); }));
const PRESETS = { glace: [45, 12, 55], canicule: [8, 94, 25], eden: [62, 58, 42] };
document.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { const [r, s, w] = PRESETS[b.dataset.p]; setRain(r); setSun(s); setWind(w); chime(b.dataset.p === 'glace' ? 0.5 : b.dataset.p === 'canicule' ? 0.75 : 1); }));

/* ------------------------------------------------------------------ simulation */
let stats = { forest: 0, prairie: 0, desert: 0, ice: 0, banquise: 0, meanT: 0 };
function simulate(dt) {
  const f = -Math.cos(year), dfl = Math.sin(year);
  const windReach = 1.4 + ctl.wind * 5.5, Mn = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const la = lat[i], alt = land[i] ? el[i] : 0;
    T[i] = -26 + 62 * ctl.sun + 30 * (Math.sqrt(1 - la * la) - 0.55) - 28 * alt + 13 * f * la + (land[i] ? 0 : 3);
  }
  for (let i = 0; i < N; i++) { let s = 0; for (const j of NB[i]) s += M[j]; Mn[i] = s / NB[i].length; }
  let nl = 0, forest = 0, prairie = 0, desert = 0, ice = 0, banq = 0, sumT = 0;
  for (let i = 0; i < N; i++) {
    if (!land[i]) { F[i] = clamp(F[i] + (T[i] < -3 ? 0.12 : -0.05 * (T[i] + 3)) * dt, 0, 1); if (F[i] > 0.5) banq++; continue; }
    nl++; sumT += T[i];
    const t = T[i], coastF = Math.exp(-coast[i] / windReach);
    const inflow = ctl.rain * (0.18 + 0.82 * coastF) * (0.55 + 0.45 * clamp(t / 25, 0, 1)) * (t < 0 ? 0.5 : 1);
    const evap = clamp(t, 0, 48) / 48 * (0.18 + 0.5 * (1 - V[i] * 0.6)) * M[i];
    M[i] = clamp(M[i] + (inflow * 0.5 - evap * 0.65) * dt + (Mn[i] - M[i]) * 0.35 * ctl.wind * dt, 0, 1);
    if (t < 0) S[i] = clamp(S[i] + (0.04 + ctl.rain * 0.45) * 0.5 * dt, 0, 1); else S[i] = clamp(S[i] - (t * 0.04 + 0.03) * dt, 0, 1);
    const suit = Math.exp(-(((t - 19) / 13) ** 2)) * sstep(0.1, 0.5, M[i]) * (1 - S[i]) * (el[i] < 0.75 ? 1 : 0.25);
    let seeded = V[i] > 0.04; if (!seeded) for (const j of NB[i]) if (V[j] > 0.3) { seeded = true; break; }
    if (suit > V[i]) V[i] += (suit - V[i]) * (seeded ? 0.11 : 0.004) * dt; else V[i] += (suit - V[i]) * 0.22 * dt;
    if (V[i] > 0.6 && S[i] < 0.5) forest++; else if (V[i] > 0.2) prairie++;
    if (M[i] < 0.13 && t > 12 && V[i] < 0.2) desert++;
    if (S[i] > 0.5) ice++;
  }
  stats = { forest: forest / nl, prairie: prairie / nl, desert: desert / nl, ice: ice / nl, banquise: banq / (N - nl), meanT: sumT / nl, f, dfl };
}

/* ------------------------------------------------------------------ couleurs et géométrie */
const C = {
  soil: new THREE.Color(0.42, 0.33, 0.22), grass: new THREE.Color(0.38, 0.56, 0.2), forest: new THREE.Color(0.13, 0.31, 0.12), sand: new THREE.Color(0.88, 0.74, 0.48),
  rock: new THREE.Color(0.43, 0.41, 0.4), snow: new THREE.Color(0.95, 0.97, 1), dry: new THREE.Color(0.66, 0.6, 0.36), autumn: new THREE.Color(0.78, 0.45, 0.14),
  deep: new THREE.Color(0.03, 0.1, 0.2), shallow: new THREE.Color(0.38, 0.6, 0.55), ice: new THREE.Color(0.86, 0.93, 0.98), tundra: new THREE.Color(0.45, 0.45, 0.3),
  river: new THREE.Color(0.28, 0.6, 0.9), bed: new THREE.Color(0.5, 0.42, 0.3),
  leaf: new THREE.Color(0.14, 0.38, 0.15), leafDark: new THREE.Color(0.08, 0.24, 0.12), bare: new THREE.Color(0.35, 0.27, 0.2),
};
function seasonal(i) { const hemi = Math.sign(lat[i]) || 1, w = sstep(0.3, 0.6, Math.abs(lat[i])), fl = stats.f * hemi, dfl = stats.dfl * hemi; return { autumn: w * clamp(-dfl, 0, 1) * sstep(0.7, -0.1, fl), winter: w * sstep(-0.35, -0.85, fl) }; }
function paint() {
  const col = colAttr.array, pos = posAttr.array;
  for (let i = 0; i < N; i++) {
    let r;
    if (land[i]) {
      r = 1.004 + el[i] * 0.085;
      _c.copy(C.soil).lerp(C.dry, sstep(0.35, 0.1, M[i]) * 0.6);
      _c.lerp(C.sand, sstep(0.16, 0.06, M[i]) * sstep(8, 18, T[i]) * (1 - V[i]));
      _c.lerp(C.tundra, sstep(6, 0, T[i]) * 0.6);
      const { autumn } = seasonal(i);
      _c.lerp(C.grass, sstep(0.05, 0.4, V[i])); _c.lerp(C.forest, sstep(0.45, 0.85, V[i]));
      _c.lerp(C.autumn, autumn * V[i] * 0.55);
      _c.lerp(C.rock, sstep(0.55, 0.85, el[i]) * 0.8);
      _c.lerp(C.snow, sstep(0.25, 0.7, S[i]));
    } else {
      r = 0.975 + 0.031 * sstep(0.35, 0.65, F[i]);
      _c.copy(C.deep).lerp(C.shallow, shore[i] ? 0.8 : 0); _c.lerp(C.ice, sstep(0.35, 0.65, F[i]));
    }
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    pos[i * 3] = P[i * 3] * r; pos[i * 3 + 1] = P[i * 3 + 1] * r; pos[i * 3 + 2] = P[i * 3 + 2] * r;
  }
  colAttr.needsUpdate = true; posAttr.needsUpdate = true;
  // rivières
  for (let k = 0; k < segCount * 2; k++) {
    const i = rivNodes[k], r = (land[i] ? 1.004 + el[i] * 0.085 : 1.0) + 0.0025;
    rivPos[k * 3] = P[i * 3] * r; rivPos[k * 3 + 1] = P[i * 3 + 1] * r; rivPos[k * 3 + 2] = P[i * 3 + 2] * r;
    _c.copy(C.bed).lerp(C.river, sstep(0.28, 0.6, M[i]) * (1 - S[i])).lerp(C.snow, sstep(0.4, 0.8, S[i]));
    rivCol[k * 3] = _c.r; rivCol[k * 3 + 1] = _c.g; rivCol[k * 3 + 2] = _c.b;
  }
  rivGeo.attributes.position.needsUpdate = true; rivGeo.attributes.color.needsUpdate = true;
  // forêts
  slots.forEach((sl, k) => {
    const i = sl.i, { autumn, winter } = seasonal(i), s = sstep(0.42, 0.85, V[i]) * sl.s * (1 - S[i] * 0.5) * (1 - winter * 0.35);
    const r = 1.004 + el[i] * 0.085;
    _m.compose(_v.copy(sl.p).multiplyScalar(r), sl.q, _s.setScalar(s < 0.05 ? 0 : s)); trees.setMatrixAt(k, _m);
    _c.copy(sl.s > 1 ? C.leafDark : C.leaf).lerp(C.autumn, autumn).lerp(C.bare, winter * 0.8).lerp(C.snow, S[i] * 0.9);
    trees.setColorAt(k, _c);
  });
  trees.instanceMatrix.needsUpdate = true; trees.instanceColor.needsUpdate = true;
}

/* ------------------------------------------------------------------ troupeaux */
function updateHerd(dt) {
  const target = Math.round(DEER * clamp(stats.forest * 1.4 + stats.prairie * 0.4, 0, 1));
  herd = herd.filter(d => V[d.to] > 0.18 && S[d.to] < 0.6);
  if (herd.length < target && Math.random() < dt * 3) { const k = slots[Math.floor(Math.random() * slots.length)].i; if (V[k] > 0.55) herd.push({ from: k, to: k, t: 1, wait: Math.random() * 2 }); }
  if (herd.length > target && Math.random() < dt) herd.shift();
  herd.forEach((d, k) => {
    if (d.t >= 1) { d.wait -= dt; if (d.wait < 0) { const opts = NB[d.to].filter(j => land[j] && V[j] > 0.3); if (opts.length) { d.from = d.to; d.to = opts[Math.floor(Math.random() * opts.length)]; d.t = 0; } d.wait = 1 + Math.random() * 3; } }
    else d.t = Math.min(1, d.t + dt * 0.5);
    const a = dir(d.from), b = dir(d.to), p = a.lerp(b, d.t).normalize(), r = 1.004 + (el[d.from] * (1 - d.t) + el[d.to] * d.t) * 0.085;
    _q.setFromUnitVectors(UP, p); const fwd = b.clone().sub(dir(d.from)).applyQuaternion(_q.clone().invert()); _q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-fwd.z, fwd.x)));
    _m.compose(p.multiplyScalar(r), _q, _s.setScalar(1)); deerMesh.setMatrixAt(k, _m);
  });
  for (let k = herd.length; k < DEER; k++) { _m.makeScale(0, 0, 0); deerMesh.setMatrixAt(k, _m); }
  deerMesh.instanceMatrix.needsUpdate = true;
}
function updateBirds(t) {
  const life = stats.forest + stats.prairie * 0.5;
  flocks.forEach((fl, f) => {
    fl.vis += ((life > 0.15 + f * 0.1 ? 1 : 0) - fl.vis) * 0.02;
    const base = new THREE.Vector3(1, 0, 0); if (Math.abs(fl.axis.x) > 0.9) base.set(0, 1, 0); const u = base.cross(fl.axis).normalize(), w = fl.axis.clone().cross(u);
    for (let b = 0; b < 9; b++) {
      const a = t * fl.sp + fl.ph - (b % 3) * 0.012 - Math.floor(b / 3) * 0.02, side = ((b % 3) - 1) * 0.012 + (Math.floor(b / 3) - 1) * 0.006;
      const p = u.clone().multiplyScalar(Math.cos(a)).add(w.clone().multiplyScalar(Math.sin(a))), tng = u.clone().multiplyScalar(-Math.sin(a)).add(w.clone().multiplyScalar(Math.cos(a)));
      p.addScaledVector(fl.axis, side).normalize().multiplyScalar(1.12 + Math.sin(a * 3 + b) * 0.008);
      _m.lookAt(_v.set(0, 0, 0), tng, p.clone().normalize()); _q.setFromRotationMatrix(_m);
      const flap = 0.6 + Math.abs(Math.sin(t * 9 + b)) * 0.6;
      _m.compose(p, _q, _s.set(fl.vis, fl.vis * flap, fl.vis)); birdMesh.setMatrixAt(f * 9 + b, _m);
    }
  });
  birdMesh.instanceMatrix.needsUpdate = true;
  return flocks.reduce((s, f) => s + (f.vis > 0.5 ? 9 : 0), 0);
}
function updateClouds(dt) {
  const active = 0.1 + ctl.rain * 0.9, cold = stats.meanT < 0;
  clouds.forEach((cl, k) => {
    cl.a += ((cl.order < active ? 1 : 0) - cl.a) * dt * 0.6;
    const grey = 1 - ctl.rain * 0.45;
    cl.puffs.forEach((pf, p) => { _m.compose(_v.copy(pf.o).applyQuaternion(cl.q).add(_s.copy(cl.d).multiplyScalar(1.085)), cl.q, _s.set(1, 0.55, 1).multiplyScalar(pf.s * cl.a * (1.1 + ctl.rain * 0.7))); cloudMesh.setMatrixAt(k * PUFF + p, _m); cloudMesh.setColorAt(k * PUFF + p, _c.setRGB(grey, grey, grey * 1.02)); });
  });
  cloudMesh.instanceMatrix.needsUpdate = true; if (cloudMesh.instanceColor) cloudMesh.instanceColor.needsUpdate = true;
  rainMat.opacity += ((ctl.rain > 0.3 ? sstep(0.3, 0.8, ctl.rain) * 0.75 : 0) - rainMat.opacity) * dt * 2;
  rainMat.color.set(cold ? 0xffffff : 0xa8d8ff); rainMat.size = cold ? 0.011 : 0.007;
  const live = clouds.filter(c => c.a > 0.6);
  drops.forEach((d, k) => {
    d.r -= dt * (cold ? 0.05 : 0.22);
    if (d.r < 1.0 || !live.length) { const c = live[Math.floor(Math.random() * live.length)]; if (c) { d.c = c; d.r = 1.08; d.o.set((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.05).applyQuaternion(c.q); } }
    const c = d.c; if (!c) return; _v.copy(c.d).multiplyScalar(d.r).add(d.o);
    rainPos[k * 3] = _v.x; rainPos[k * 3 + 1] = _v.y; rainPos[k * 3 + 2] = _v.z;
  });
  rainGeo.attributes.position.needsUpdate = true;
}

/* ------------------------------------------------------------------ son */
let ac = null, master, muted = false, pad = [], padF, rainG, windG, windF;
function loopNoise(color) {
  const b = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate), d = b.getChannelData(0); let l = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = color === 'brown' ? (l + 0.02 * w) / 1.02 : w; d[i] = color === 'brown' ? l * 3 : w; }
  const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s;
}
function audio() {
  if (ac) return; ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
  padF = ac.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 600; padF.connect(master);
  [110, 164.8, 220, 277.2, 329.6].forEach((fq, k) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = k % 2 ? 'triangle' : 'sine'; o.frequency.value = fq; o.detune.value = (Math.random() - 0.5) * 8; g.gain.value = 0.035; o.connect(g); g.connect(padF); o.start(); pad.push(o); });
  const r = loopNoise('white'), rf = ac.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2600; rf.Q.value = 0.4; rainG = ac.createGain(); rainG.gain.value = 0; r.connect(rf); rf.connect(rainG); rainG.connect(master);
  const w = loopNoise('brown'); windF = ac.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = 1.2; windG = ac.createGain(); windG.gain.value = 0; w.connect(windF); windF.connect(windG); windG.connect(master);
}
function tone(f, d, v, at = 0) { if (!ac || muted) return; const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05); }
function chime(k = 1) { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f * k, 1.6, 0.06, i * 0.09)); }
function chirp() { if (!ac || muted) return; const t = ac.currentTime, b = 2800 + Math.random() * 1500; for (let i = 0; i < 3; i++) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(b, t + i * 0.11); o.frequency.exponentialRampToValueAtTime(b * 1.3, t + i * 0.11 + 0.07); g.gain.setValueAtTime(0.025, t + i * 0.11); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.11 + 0.08); o.connect(g); g.connect(master); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.1); } }
function updateAudio(t, birds) {
  if (!ac) return; const life = clamp(stats.forest + stats.prairie * 0.5, 0, 1), k = ac.currentTime;
  padF.frequency.setTargetAtTime(250 + 1500 * life * (1 - stats.ice), k, 1);
  pad[3].frequency.setTargetAtTime(life > 0.25 ? 277.2 : 261.6, k, 2);       // majeur quand la vie s'installe
  rainG.gain.setTargetAtTime(muted ? 0 : sstep(0.25, 1, ctl.rain) * 0.09, k, 0.5);
  windG.gain.setTargetAtTime(muted ? 0 : ctl.wind * ctl.wind * 0.22, k, 0.5); windF.frequency.setTargetAtTime(380 + 500 * ctl.wind + Math.sin(t * 0.7) * 150, k, 0.3);
  if (birds && Math.random() < 0.004 * birds / 9) chirp();
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'muet' : 'son'; if (master) master.gain.value = muted ? 0 : 0.8; });

/* ------------------------------------------------------------------ toucher de Dame Nature */
const ray = new THREE.Raycaster(), down = { x: 0, y: 0, t: 0 };
renderer.domElement.addEventListener('pointerdown', e => { audio(); Object.assign(down, { x: e.clientX, y: e.clientY, t: performance.now() }); });
renderer.domElement.addEventListener('pointerup', e => {
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || performance.now() - down.t > 450) return;
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = ray.intersectObject(planet)[0]; if (!hit) return;
  bless(hit.face.a);
});
function bless(c) {
  let ring = [c]; const seen = new Set(ring);
  for (let r = 0; r < 3; r++) { const nx = []; for (const i of ring) { if (land[i]) { M[i] = Math.min(1, M[i] + 0.5 - r * 0.1); V[i] = Math.max(V[i], 0.45 - r * 0.08); S[i] = Math.max(0, S[i] - 0.6); } else F[i] = Math.max(0, F[i] - 0.5); for (const j of NB[i]) if (!seen.has(j)) { seen.add(j); nx.push(j); } } ring = nx; }
  burst(dir(c).multiplyScalar(1.02 + el[c] * 0.085), 70, 0xffe7a0, 0.12, 1.4); chime(1 + Math.random() * 0.12); $('hint').style.opacity = 0;
}

/* ------------------------------------------------------------------ texte */
const SEASONS = ['Printemps', 'Été', 'Automne', 'Hiver'];
let moodText = '';
function updateText(birds) {
  const ph = (((year - Math.PI / 2) / (Math.PI * 2)) % 1 + 1) % 1;
  $('season').textContent = `${SEASONS[Math.floor(ph * 4)]} · An ${years + 1}`;
  const s = stats, glace = s.ice * 0.6 + s.banquise * 0.4;
  const m = glace > 0.45 ? 'Ère glaciaire. Le monde retient son souffle.' : s.desert > 0.4 ? 'Le désert avance. La terre a soif.' : s.meanT > 30 && s.forest < 0.2 ? 'La planète suffoque.'
    : ctl.rain > 0.88 ? 'Le déluge. Les fleuves débordent.' : s.forest > 0.5 ? 'Les forêts débordent. La vie foisonne.' : s.forest > 0.25 ? 'La planète respire.' : s.prairie > 0.3 ? 'Les prairies s’étendent.' : 'Tout reste à faire.';
  if (m !== moodText) { moodText = m; const el = $('mood'); el.style.opacity = 0; setTimeout(() => { el.textContent = m; el.style.opacity = 1; }, 500); }
  const pc = x => Math.round(x * 100) + ' %';
  $('stats').innerHTML = `Forêts ${pc(s.forest)}<i style="background:#2f6a2a"></i><br>Prairies ${pc(s.prairie)}<i style="background:#7fa040"></i><br>Déserts ${pc(s.desert)}<i style="background:#e0bd7a"></i><br>Glaces ${pc(glace)}<i style="background:#e8f2fa"></i><br>${herd.length} cerfs · ${birds} oiseaux · ${Math.round(s.meanT)} °C`;
}

/* ------------------------------------------------------------------ boucle */
function resize() { if (!innerWidth || !innerHeight) return; renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; const portrait = innerWidth < innerHeight; camera.fov = portrait ? 58 : 38; camera.updateProjectionMatrix(); camera.position.setLength(portrait ? 5.4 : 4.4); }
addEventListener('resize', resize); resize();
let acc = 0, wall = 0, txtAcc = 1, birdsNow = 0;
const sunDir = new THREE.Vector3();
function step(dt) {
  wall += dt; const simDt = dt * (speed === 4 ? 2.5 : 1);
  if (speed) { year += dt * speed * Math.PI * 2 / 90; if (year > Math.PI * 2.5) { year -= Math.PI * 2; years++; } }
  acc += simDt; if (acc > 0.12) { simulate(acc); paint(); acc = 0; }
  spin.rotation.y += dt * 0.045; cloudG.rotation.y += dt * (0.045 + 0.02 + ctl.wind * 0.1);
  // le soleil reste du côté de l'observateur ; c'est l'axe de la planète qui pivote au fil de l'année (été nord : pôle nord vers le soleil)
  sunDir.copy(SUN_DIR); sunLight.position.copy(sunDir).multiplyScalar(10); sunSprite.position.copy(sunDir).multiplyScalar(60);
  const phi = SUN_AZ + year + Math.PI; tilt.quaternion.setFromAxisAngle(_v.set(Math.sin(phi), 0, -Math.cos(phi)), TILT);
  sunLight.intensity = 1.6 + ctl.sun * 2.6; sunLight.color.setHSL(0.1 - ctl.sun * 0.03, 0.3 + ctl.sun * 0.25, 0.8);
  atmo.material.uniforms.uSun.value.copy(sunDir); atmo.material.uniforms.uTint.value.setRGB(0.32 + ctl.sun * 0.35, 0.6, 1.0 - ctl.sun * 0.25);
  updateClouds(dt); updateHerd(dt); birdsNow = updateBirds(wall);
  // effets
  if (stats.banquise < 0.6 && Math.random() < dt * 0.35) { const i = Math.floor(Math.random() * N); if (!land[i] && F[i] < 0.3 && !shore[i]) burst(dir(i).multiplyScalar(1.0), 14, 0xdff4ff, 0.03, 1.1); }
  for (const p of fx) { p.t += dt; p.v.multiplyScalar(1 - dt * 1.5); p.p.addScaledVector(p.v, dt); }
  for (let k = fx.length - 1; k >= 0; k--) if (fx[k].t > fx[k].life) fx.splice(k, 1);
  fxPos.fill(0); fxCol.fill(0); fx.forEach((p, k) => { const a = 1 - p.t / p.life; fxPos.set([p.p.x, p.p.y, p.p.z], k * 3); fxCol.set([p.c.r * a, p.c.g * a, p.c.b * a], k * 3); });
  fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.color.needsUpdate = true; fxGeo.setDrawRange(0, fx.length);
  txtAcc += dt; if (txtAcc > 0.5) { txtAcc = 0; updateText(birdsNow); }
  updateAudio(wall, birdsNow);
}
let last = performance.now();
function frame(now) { requestAnimationFrame(frame); step(Math.min(0.05, (now - last) / 1000)); last = now; controls.update(); renderer.render(scene, camera); }
simulate(0.01); paint(); requestAnimationFrame(frame);
window.nature = { advance(sec) { for (let s = 0; s < sec; s += 1 / 30) step(1 / 30); controls.update(); renderer.render(scene, camera); return stats; }, ctl, bless, setRain, setSun, setWind, get stats() { return stats; } };
