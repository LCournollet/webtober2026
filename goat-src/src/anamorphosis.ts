import * as THREE from 'three';

/** Données produites par tools/bake.py */
export interface Portrait {
  aspect: number;
  tris: number[];      // 6 nombres par triangle : x0 y0 x1 y1 x2 y2 (portrait normalisé, hauteur = 2)
  colors: string[];    // 18 caractères hexadécimaux par triangle : une couleur sRGB par sommet
  detail: number[];    // importance de la zone (0..1)
}

/** Distance de la caméra de référence au plan du portrait. */
export const EYE_DIST = 8;

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Anamorphose : chaque triangle du portrait est repoussé à sa propre profondeur z, le long des rayons qui partent
 * de l'œil de référence E = (0, 0, EYE_DIST). Un point (x, y) du portrait (plan z = 0) placé à la profondeur z devient
 *     P = (x · (D − z) / D,  y · (D − z) / D,  z)
 * — il reste exactement sur son rayon, donc vu depuis E il retombe à sa place. Vu d'ailleurs, les profondeurs
 * différentes dispersent les fragments. Rien ne bouge jamais : seule la perspective fait l'image.
 */
export function buildSculpture(p: Portrait, opts: { seed?: number; gap?: number } = {}) {
  const R = rng(opts.seed ?? 9), D = EYE_DIST, gap = opts.gap ?? 0.96;
  const n = p.tris.length / 6;
  const pos = new Float32Array(n * 9), col = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) {
    const t = p.tris.slice(i * 6, i * 6 + 6);
    const cx = (t[0] + t[2] + t[4]) / 3, cy = (t[1] + t[3] + t[5]) / 3;
    // profondeur organique : un champ ondulant à grande échelle + du hasard, pour des « strates » irrégulières
    const field = Math.sin(cx * 2.3 + 1.1) * Math.cos(cy * 1.9 - 0.5) * 0.65 + Math.sin((cx - cy) * 3.7 + 0.8) * 0.35;
    // surtout le champ lisse (des voisins à des profondeurs proches : l'image se déforme puis se recompose en douceur),
    // un peu de hasard pour que les fragments se détachent les uns des autres
    const z = THREE.MathUtils.clamp(field * 2.8 + (R() * 2 - 1) * 0.28, -3.4, 2.8);
    // légère inclinaison propre à chaque fragment (chaque sommet reste sur son rayon : l'image n'est pas affectée)
    const tx = (R() * 2 - 1) * 0.5, ty = (R() * 2 - 1) * 0.5;
    for (let k = 0; k < 3; k++) {
      // on rétrécit le triangle autour de son centre : de fins interstices entre les fragments
      const x = cx + (t[k * 2] - cx) * gap, y = cy + (t[k * 2 + 1] - cy) * gap;
      const zv = z + tx * (x - cx) + ty * (y - cy);
      const s = (D - zv) / D;
      pos.set([x * s, y * s, zv], i * 9 + k * 3);
      const h = p.colors[i].slice(k * 6, k * 6 + 6);
      col.set([parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255], i * 9 + k * 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();   // géométrie non indexée : une normale par facette
  g.computeBoundingSphere();

  // un seul matériau, un seul appel de dessin. Les couleurs sRGB du portrait sont rendues telles quelles
  // quand un fragment fait face à la caméra ; vu de biais il s'assombrit et accroche un reflet discret.
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 color;
      varying vec3 vColor; varying vec3 vN; varying vec3 vW;
      void main() {
        vColor = color;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW);
        float facing = clamp(dot(N, V), 0.0, 1.0);
        vec3 L = normalize(vec3(-0.45, 0.6, 0.65)), H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 70.0) * 0.32;
        vec3 c = vColor * 1.08 * mix(0.5, 1.0, smoothstep(0.2, 0.85, facing)) + spec * vec3(1.0, 0.97, 0.9);
        if (!gl_FrontFacing) c *= 0.55;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(g, m);
}

/** Poussière en suspension : donne de la profondeur au vide, presque invisible. */
export function buildDust(count: number) {
  const R = rng(3), pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) pos.set([(R() - 0.5) * 16, (R() - 0.5) * 10, (R() - 0.5) * 16], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.02, color: 0x8a8a92, transparent: true, opacity: 0.45, depthWrite: false }));
}
