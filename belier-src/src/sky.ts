import * as THREE from 'three';
import { ARIES, FIELD, SPECTRAL, type Star } from './stars';

/** Direction sur la sphère céleste (vue de l'intérieur : l'est, ascension droite croissante, est à gauche, le nord en haut). */
export function dir(raHours: number, decDeg: number) {
  const a = (raHours / 24) * Math.PI * 2, d = THREE.MathUtils.degToRad(decDeg);
  return new THREE.Vector3(Math.cos(d) * Math.cos(a), Math.sin(d), -Math.cos(d) * Math.sin(a));
}
const SKY_R = 60;
const GAL_NORTH = dir(12.857, 27.13);     // pôle nord galactique : la Voie lactée suit le vrai plan de la Galaxie

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const NOISE = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
`;

/** Le fond du ciel : dégradé nocturne, lueur atmosphérique près de l'horizon, Voie lactée et ses bandes de poussière, poussière d'étoiles. */
export function skyDome() {
  const uniforms = { uRes: { value: new THREE.Vector2(1, 1) }, uGal: { value: GAL_NORTH }, uTime: { value: 0 }, uReveal: { value: 0 } };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, 96, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms,
    vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uRes; uniform vec3 uGal; uniform float uTime, uReveal; varying vec3 vDir;
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        vec2 sc = gl_FragCoord.xy / uRes;
        // nuit profonde en haut, bleu-vert de la lueur atmosphérique près de l'horizon, pollution lumineuse ambrée à gauche
        vec3 col = mix(vec3(0.004, 0.008, 0.02), vec3(0.012, 0.022, 0.04), smoothstep(1.0, 0.25, sc.y));
        col += vec3(0.03, 0.055, 0.06) * pow(smoothstep(0.55, 0.0, sc.y), 2.0);
        col += vec3(0.09, 0.045, 0.015) * pow(smoothstep(0.45, 0.0, sc.y), 2.4) * smoothstep(1.0, 0.0, sc.x) * 0.9;
        // Voie lactée : latitude galactique b, structure en nuages (fbm) et bandes de poussière sombres
        float b = asin(clamp(dot(d, uGal), -1.0, 1.0));
        float band = exp(-pow(b / 0.26, 2.0));
        float clouds = fbm(d * 5.0) * 0.6 + fbm(d * 13.0 + 4.0) * 0.4;
        float dust = smoothstep(0.42, 0.72, fbm(d * 7.0 + 21.0)) * exp(-pow(b / 0.1, 2.0));
        vec3 mw = mix(vec3(0.45, 0.52, 0.75), vec3(0.9, 0.82, 0.68), smoothstep(0.35, 0.75, clouds));
        col += mw * band * pow(clouds, 1.3) * 0.34 * (1.0 - dust * 0.85);
        col += vec3(0.5, 0.55, 0.75) * exp(-pow(b / 0.6, 2.0)) * 0.018;   // halo diffus de la Galaxie
        // poussière d'étoiles non résolues (des milliers de points minuscules), plus dense dans la Voie lactée
        vec3 g = d * 380.0, c = floor(g), f = fract(g) - 0.5;
        float h = hash(c);
        float on = step(0.976 - band * 0.016, h);
        float tw = 0.75 + 0.25 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
        col += vec3(0.75, 0.8, 0.95) * on * smoothstep(0.16, 0.0, length(f)) * (0.25 + 0.6 * fract(h * 91.7)) * tw;
        // très léger grain pour éviter les bandes de dégradé
        col += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  return { mesh, uniforms };
}

/** Les étoiles visibles : réelles (catalogue) + quelques milliers d'étoiles faibles tirées au hasard. */
export function starField(count: number) {
  const R = rng(7), all: Star[] = [...ARIES, ...FIELD];
  // étoiles faibles : plus nombreuses près du plan galactique, magnitudes surtout faibles
  const sp = ['B', 'A', 'A', 'F', 'F', 'G', 'G', 'K', 'K', 'K', 'M'];
  while (all.length < count) {
    const v = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1); if (v.lengthSq() > 1 || v.lengthSq() < 0.01) continue; v.normalize();
    const b = Math.abs(Math.asin(v.dot(GAL_NORTH)));
    if (R() > 0.35 + 0.65 * Math.exp(-((b / 0.35) ** 2))) continue;
    const mag = 4.6 + Math.pow(R(), 0.45) * 2.6;
    const ra = ((Math.atan2(-v.z, v.x) / (Math.PI * 2)) * 24 + 24) % 24, dec = THREE.MathUtils.radToDeg(Math.asin(v.y));
    all.push({ name: '', ra, dec, mag, sp: sp[Math.floor(R() * sp.length)] });
  }
  const n = all.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
  all.forEach((s, i) => {
    pos.set(dir(s.ra, s.dec).multiplyScalar(SKY_R * 0.95).toArray(), i * 3);
    const c = SPECTRAL[s.sp] ?? SPECTRAL.F;
    const bright = Math.pow(10, -0.4 * (s.mag - 2.0));            // flux relatif à une étoile de magnitude 2
    col.set(c.map(k => k * Math.min(1.8, 0.55 + Math.sqrt(bright) * 0.9)), i * 3);
    size[i] = THREE.MathUtils.clamp(3.6 + Math.sqrt(bright) * 12, 3.6, 34);
    ph[i] = R() * 100;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const uniforms = { uTime: { value: 0 }, uScale: { value: 1 }, uGlow: { value: 0 } };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float size, phase; uniform float uTime, uScale;
      varying vec3 vC; varying float vS;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // scintillation : légère, plus marquée pour les étoiles brillantes
        float tw = 0.88 + 0.12 * sin(uTime * (2.0 + mod(phase, 3.0)) + phase) * sin(uTime * 1.3 + phase * 2.0);
        vC = color * tw; vS = size;
        gl_PointSize = size * uScale;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vS;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
        float core = exp(-r * r * mix(6.0, 26.0, smoothstep(5.0, 18.0, vS)));   // petites étoiles : cœur plus large, sinon elles disparaissent
        float halo = exp(-r * 5.0) * (0.2 + 0.3 * smoothstep(8.0, 22.0, vS));   // les plus brillantes rayonnent davantage
        // aigrettes de diffraction, seulement pour les plus brillantes
        float spikes = (exp(-abs(p.x) * 40.0) * exp(-abs(p.y) * 3.2) + exp(-abs(p.y) * 40.0) * exp(-abs(p.x) * 3.2)) * smoothstep(9.0, 22.0, vS) * 0.45;
        float a = core + halo + spikes;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vC * a, a);
      }`,
  }));
  return { points: pts, uniforms };
}
