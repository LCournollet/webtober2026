/*
 * Ricochets — un lac au coucher du soleil. Le ciel, le soleil et les collines sont une seule fonction (skyColor),
 * utilisée à la fois pour le dôme céleste et pour les reflets de l'eau : tout ce qu'on voit se reflète exactement.
 */
import * as THREE from 'three';

const $ = id => document.getElementById(id);
const mobile = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 2000);
const HOME = new THREE.Vector3(0, 1.7, 0), HOME_LOOK = new THREE.Vector3(0, 1.1, -30);
camera.position.copy(HOME); camera.lookAt(HOME_LOOK);
const SUN = new THREE.Vector3(-0.17, 0.055, -1).normalize();

const SKY = /* glsl */ `
  uniform vec3 uSun; uniform float uTime;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n2(p); p *= 2.07; a *= 0.5; } return v; }
  float hills(float az, float far) {
    return far * (0.022 + 0.018 * sin(az * 3.1 + 1.0) + 0.011 * sin(az * 7.3 + 2.0) + 0.006 * sin(az * 17.0)) + (1.0 - far) * (0.036 + 0.02 * sin(az * 2.3 - 0.6) + 0.012 * sin(az * 5.9 + 1.3) + 0.005 * sin(az * 23.0));
  }
  vec3 skyColor(vec3 d) {
    float el = d.y, s = max(dot(d, uSun), 0.0);
    vec3 hor = vec3(1.0, 0.56, 0.32), mid = vec3(0.86, 0.42, 0.46), top = vec3(0.17, 0.15, 0.36);
    vec3 col = mix(hor, mid, smoothstep(0.0, 0.12, el));
    col = mix(col, top, smoothstep(0.08, 0.6, el));
    // de longs nuages effilés, éclairés par en dessous
    if (el > 0.01) {
      vec2 cp = vec2(d.x / (el + 0.08), d.z / (el + 0.08)) * 0.7 + vec2(uTime * 0.004, 0.0);
      float c = smoothstep(0.52, 0.8, fbm(cp * vec2(0.6, 2.4)));
      vec3 cc = mix(vec3(1.0, 0.62, 0.45), vec3(0.55, 0.3, 0.45), smoothstep(0.0, 0.35, el)) + vec3(1.0, 0.7, 0.4) * pow(s, 6.0) * 0.8;
      col = mix(col, cc, c * 0.75 * smoothstep(0.01, 0.06, el));
    }
    // soleil : disque, couronne, grand halo
    col += vec3(1.0, 0.7, 0.42) * pow(s, 8.0) * 0.32 + vec3(1.0, 0.8, 0.55) * pow(s, 160.0) * 0.7;
    col += vec3(1.0, 0.92, 0.75) * smoothstep(0.99955, 0.99975, s) * 6.0;
    // collines : deux plans, le plus lointain plus brumeux
    float az = atan(d.x, -d.z);
    if (el < hills(az, 0.0)) col = mix(vec3(0.12, 0.07, 0.13), hor * 0.55, 0.22);
    else if (el < hills(az + 1.7, 1.0)) col = mix(vec3(0.26, 0.13, 0.22), hor * 0.8, 0.45);
    return col;
  }`;

/* ------------------------------------------------------------------ ciel */
const skyU = { uSun: { value: SUN }, uTime: { value: 0 } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `${SKY} varying vec3 vD; void main() { vec3 d = normalize(vD); gl_FragColor = vec4(skyColor(vec3(d.x, max(d.y, 0.0), d.z)), 1.0); }`,
})));

/* ------------------------------------------------------------------ eau */
const MAXR = 24;
const ripples = Array.from({ length: MAXR }, () => new THREE.Vector4(0, 0, -99, 0));
let rippleI = 0;
const waterU = { ...skyU, uRip: { value: ripples } };
const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
  uniforms: waterU,
  vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `
    ${SKY}
    uniform vec4 uRip[${MAXR}]; varying vec3 vW;
    float height(vec2 p) {
      float h = 0.0, t = uTime;
      h += 0.020 * sin(dot(p, vec2(0.12, 0.9)) * 1.3 + t * 1.1);
      h += 0.014 * sin(dot(p, vec2(-0.7, 0.6)) * 2.1 + t * 1.6);
      h += 0.008 * sin(dot(p, vec2(0.95, 0.3)) * 3.7 + t * 2.3);
      h += 0.005 * sin(dot(p, vec2(-0.3, -0.95)) * 6.1 + t * 3.1);
      h += 0.003 * (n2(p * 3.0 + t * 0.6) - 0.5);
      for (int i = 0; i < ${MAXR}; i++) {
        float age = t - uRip[i].z; if (age < 0.0 || age > 6.0) continue;
        float d = distance(p, uRip[i].xy), fr = d - 1.6 * age;
        h += uRip[i].w * exp(-age * 0.9) * sin(fr * 11.0) * exp(-fr * fr * 2.2) / (1.0 + d * 0.6);
      }
      return h;
    }
    void main() {
      vec2 p = vW.xz; float dist = distance(cameraPosition.xz, p), e = 0.04 + dist * 0.01;
      vec3 n = normalize(vec3(-(height(p + vec2(e, 0)) - height(p - vec2(e, 0))) / (2.0 * e), 1.0, -(height(p + vec2(0, e)) - height(p - vec2(0, e))) / (2.0 * e)));
      n = normalize(mix(n, vec3(0, 1, 0), smoothstep(12.0, 160.0, dist)));      // pas de vaguelettes à l'infini (crénelage)
      vec3 V = normalize(cameraPosition - vW), R = reflect(-V, n); R.y = max(R.y, 0.004);
      vec3 refl = skyColor(R);
      float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
      vec3 deep = mix(vec3(0.03, 0.06, 0.09), vec3(0.18, 0.1, 0.1), 0.35);
      vec3 col = mix(deep, refl, clamp(fres * 1.05, 0.0, 1.0));
      float sp = max(dot(R, uSun), 0.0);
      col += vec3(1.0, 0.82, 0.55) * (pow(sp, 700.0) * 9.0 + pow(sp, 60.0) * 0.25) * (1.0 - smoothstep(300.0, 1200.0, dist));
      col = mix(col, skyColor(normalize(vec3(-V.x, 0.002, -V.z))), smoothstep(250.0, 1400.0, dist));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
scene.add(water);

/* rive : quelques roseaux en premier plan (silhouettes) */
const reedMat = new THREE.MeshBasicMaterial({ color: 0x0c0710 });
for (let i = 0; i < 70; i++) {
  const side = i % 2 ? 1 : -1, x = side * (2.2 + Math.random() * 4.5), z = -2.5 - Math.random() * 4, h = 0.7 + Math.random() * 1.5;
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.012, h, 4), reedMat);
  m.position.set(x, h / 2 - 0.1, z); m.rotation.z = (Math.random() - 0.5) * 0.3 + side * 0.08; scene.add(m);
  if (Math.random() < 0.35) { const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 2, 6), reedMat); tip.position.set(x + Math.sin(-m.rotation.z) * h / 2, h - 0.1, z); tip.rotation.z = m.rotation.z; scene.add(tip); }
}

/* ------------------------------------------------------------------ le galet */
scene.add(new THREE.HemisphereLight(0xffc9a0, 0x241a2a, 1.2));
const sunLight = new THREE.DirectionalLight(0xffb070, 2.2); sunLight.position.copy(SUN).multiplyScalar(50); scene.add(sunLight);
const stone = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.55 }));
stone.scale.set(0.09, 0.03, 0.075); stone.visible = false; scene.add(stone);
const splashes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffe2c4, size: 0.06, transparent: true, opacity: 0.9, depthWrite: false }));
scene.add(splashes);
let drops = [];

/* ------------------------------------------------------------------ son */
let ac = null, master, muted = false;
function audio() {
  if (ac) return; ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
  // clapotis : bruit brun filtré, ondulant
  const b = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate), d = b.getChannelData(0); let l = 0;
  for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3; }
  const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = ac.createGain(); g.gain.value = 0.12;
  s.connect(f); f.connect(g); g.connect(master); s.start();
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.18; lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain); lfo.start();
  const bird = () => { if (!ac) return; const t = ac.currentTime, base = 2600 + Math.random() * 1600; for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) tone(base * (1 + Math.random() * 0.2), 0.08, 0.02, 'sine', 1.3, k * 0.12); setTimeout(bird, 4000 + Math.random() * 9000); };
  setTimeout(bird, 3000);
}
function tone(f, d, v, type = 'sine', slide = 1, at = 0) {
  if (!ac || muted) return; const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, freq, v) {
  if (!ac || muted) return; const t = ac.currentTime, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = v; s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'muet' : 'son'; if (master) master.gain.value = muted ? 0 : 0.8; });

/* ------------------------------------------------------------------ lancer : glisser vers le haut */
const tc = $('trail'), tg = tc.getContext('2d');
function sizeAll() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 70 : 55; camera.updateProjectionMatrix();
  const d = Math.min(2, devicePixelRatio || 1); tc.width = innerWidth * d; tc.height = innerHeight * d; tg.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', sizeAll); sizeAll();
let swipe = null, flight = null, count = 0, best = +(localStorage.getItem('ricochets.best') || 0), returnAt = 0;
$('best').textContent = best;
addEventListener('pointerdown', e => { if (flight || e.target.closest('button, a')) return; audio(); swipe = { pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }] }; });
addEventListener('pointermove', e => { if (swipe) swipe.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); });
addEventListener('pointerup', e => {
  if (!swipe) return; const pts = swipe.pts; swipe = null;
  const end = pts[pts.length - 1], since = pts.filter(p => end.t - p.t < 140), a = since[0] ?? pts[0];
  const dt = Math.max(16, end.t - a.t) / 1000, vy = (a.y - end.y) / dt, vx = (end.x - a.x) / dt;
  if (vy < 250) return;   // pas un vrai geste vers le haut
  const speed = Math.min(30, (vy / innerHeight) * 5.5) * (0.95 + Math.random() * 0.1);
  // relâcher bas = lancer à plat (bien) ; relâcher haut = lancer en cloche (le galet coule)
  const rel = end.y / innerHeight, elev = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(26, 3, THREE.MathUtils.smoothstep(rel, 0.3, 0.85)));
  const yaw = THREE.MathUtils.clamp(Math.atan2(vx, vy) * 0.6, -0.4, 0.4);
  throwStone(speed, elev, yaw);
});
function throwStone(speed, elev, yaw) {
  count = 0; $('n').textContent = '0'; $('msg').classList.remove('on'); $('hint').classList.add('off');
  stone.position.set(0.3, 1.15, -0.6); stone.visible = true; stone.material.opacity = 1;
  flight = { v: new THREE.Vector3(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), -Math.cos(yaw) * Math.cos(elev)).multiplyScalar(speed), sunk: false, spin: 0 };
  noise(0.25, 1800, 0.12);
}
function ripple(x, z, amp) { ripples[rippleI].set(x, z, skyU.uTime.value, amp); rippleI = (rippleI + 1) % MAXR; }
function splash(p, n, up) { for (let i = 0; i < n; i++) drops.push({ p: p.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 1.6, up * (0.6 + Math.random()), (Math.random() - 0.5) * 1.6 - 0.6), life: 0 }); }
const MSG = [[0, 'Plouf.'], [1, 'Un début.'], [3, 'Joli.'], [6, 'Très beau lancer.'], [10, 'Champion du lac !'], [15, 'Légendaire.']];

/* ------------------------------------------------------------------ boucle */
const clock = new THREE.Clock(), look = HOME_LOOK.clone();
function frame() { requestAnimationFrame(frame); step(Math.min(0.033, clock.getDelta())); renderer.render(scene, camera); }
function step(dt) {
  skyU.uTime.value += dt;
  if (flight && !flight.sunk) {
    for (let s = 0; s < 4; s++) {
      const h = dt / 4; flight.v.y -= 9.8 * h; stone.position.addScaledVector(flight.v, h);
      if (stone.position.y <= 0.012 && flight.v.y < 0) {
        const vh = Math.hypot(flight.v.x, flight.v.z), ang = THREE.MathUtils.radToDeg(Math.atan(-flight.v.y / vh));
        if (vh > 2.2 && ang < 22) {
          // ricochet : l'eau renvoie le galet, il perd de la vitesse (d'autant plus que l'angle est raide)
          count++; $('n').textContent = String(count); $('n').classList.remove('pop'); void $('n').offsetWidth; $('n').classList.add('pop');
          stone.position.y = 0.012; flight.v.y = -flight.v.y * 0.62 + 0.35;
          const k = 0.91 - ang / 22 * 0.2; flight.v.x *= k; flight.v.z *= k;
          ripple(stone.position.x, stone.position.z, 0.05 + vh * 0.004); splash(stone.position, 8, 1.4);
          tone(900 - Math.min(count, 12) * 35, 0.09, 0.08, 'triangle', 0.6); noise(0.08, 3000, 0.08);
        } else {
          flight.sunk = true; ripple(stone.position.x, stone.position.z, 0.12); splash(stone.position, 22, 2.4);
          tone(220, 0.35, 0.12, 'sine', 0.45); noise(0.3, 700, 0.2);
          returnAt = skyU.uTime.value + 2.2;
          if (count > best) { best = count; localStorage.setItem('ricochets.best', String(best)); $('best').textContent = best; }
          $('msg').textContent = [...MSG].reverse().find(([n]) => count >= n)[1] + (count > 0 && count === best ? ' Nouveau record.' : '');
          $('msg').classList.add('on');
          break;
        }
      }
    }
    flight.spin += dt * 30; stone.rotation.y = flight.spin;
  }
  if (flight?.sunk) { stone.position.y -= dt * 0.6; if (stone.position.y < -0.4) stone.visible = false; if (skyU.uTime.value > returnAt) { flight = null; $('hint').classList.remove('off'); } }
  // la caméra accompagne le galet, puis revient sur la rive
  const target = flight ? new THREE.Vector3(stone.position.x * 0.4, 1.7 + Math.max(0, -stone.position.z) * 0.015, Math.min(0, stone.position.z + 7)) : HOME;
  const lookT = flight ? new THREE.Vector3(stone.position.x, Math.max(0.2, stone.position.y * 0.5), stone.position.z - 6) : HOME_LOOK;
  camera.position.lerp(target, Math.min(1, dt * (flight ? 1.6 : 1.2))); look.lerp(lookT, Math.min(1, dt * 2)); camera.lookAt(look);
  // éclaboussures
  drops = drops.filter(d => (d.life += dt) < 0.9);
  for (const d of drops) { d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt); }
  splashes.geometry.setAttribute('position', new THREE.Float32BufferAttribute(drops.flatMap(d => d.p.y > -0.02 ? [d.p.x, d.p.y, d.p.z] : []), 3));
  // trace du geste
  tg.clearRect(0, 0, innerWidth, innerHeight);
  if (swipe && swipe.pts.length > 1) { tg.strokeStyle = 'rgba(255, 244, 230, .6)'; tg.lineWidth = 3; tg.lineCap = 'round'; tg.beginPath(); swipe.pts.slice(-20).forEach((p, i) => (i ? tg.lineTo(p.x, p.y) : tg.moveTo(p.x, p.y))); tg.stroke(); }
}
frame();
window.ricochets = { throwStone, renderer, scene, camera, advance(sec) { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); renderer.render(scene, camera); return { count, flying: !!flight, x: stone.position.x, z: stone.position.z }; } };   // débogage
