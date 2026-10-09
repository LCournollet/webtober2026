/*
 * Le bélier céleste, dessiné comme dans les atlas anciens, dans un repère attaché aux étoiles :
 * origine = Bharani (le dos), (1, 0) = Hamal (le front), v vers le haut. Sheratan et Mesarthim tombent sur la corne et le museau.
 * Chaque tracé est une suite de points lissée (Catmull-Rom) puis échantillonnée finement.
 */
type P = [number, number];

const OUTLINE: P[] = [
  // dos et cou
  [-0.30, 0.02], [-0.20, 0.08], [-0.02, 0.11], [0.22, 0.11], [0.46, 0.09], [0.70, 0.10], [0.86, 0.14], [0.95, 0.22], [1.02, 0.27],
  // tête : front bombé (« nez romain ») jusqu'au museau, sur Sheratan puis Mesarthim
  [1.12, 0.25], [1.20, 0.19], [1.29, 0.06], [1.36, -0.10], [1.42, -0.22], [1.445, -0.28], [1.42, -0.33], [1.36, -0.35],
  [1.27, -0.33], [1.17, -0.28], [1.09, -0.24], [1.03, -0.30], [0.98, -0.40],
  // pattes avant repliées sous le poitrail (le saut)
  [1.00, -0.62], [1.12, -0.70], [1.08, -0.77], [0.95, -0.69], [0.87, -0.53], [0.84, -0.74], [0.92, -0.86], [0.86, -0.91],
  [0.76, -0.79], [0.72, -0.55],
  // ventre
  [0.52, -0.49], [0.30, -0.47], [0.10, -0.46],
  // pattes arrière : l'une tendue vers l'arrière, l'autre en appui
  [-0.05, -0.66], [-0.22, -0.80], [-0.34, -0.88], [-0.37, -0.83], [-0.20, -0.70], [-0.10, -0.54], [-0.16, -0.67], [-0.12, -0.86],
  [-0.20, -0.89], [-0.25, -0.68], [-0.27, -0.47], [-0.28, -0.30], [-0.31, -0.13],
  // queue
  [-0.40, -0.09], [-0.37, 0.00], [-0.30, 0.02],
];

function spiral(cx: number, cy: number, r0: number, r1: number, a0: number, turns: number, n = 40): P[] {
  return Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1), a = a0 + k * turns * Math.PI * 2, r = r0 + (r1 - r0) * k;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as P;
  });
}

/** corne enroulée : part du sommet du crâne, file vers l'arrière puis s'enroule autour de l'oreille */
const HORN = spiral(1.03, 0.04, 0.19, 0.035, Math.PI * 0.45, 1.55, 60);
const HORN_IN = spiral(1.03, 0.04, 0.13, 0.025, Math.PI * 0.5, 1.35, 46);
const EAR: P[] = [[1.12, 0.12], [1.21, 0.09], [1.15, 0.05]];
const MOUTH: P[] = [[1.41, -0.3], [1.37, -0.31], [1.33, -0.3]];
/** boucles de la toison d'or */
const CURLS: P[][] = ([[0.05, -0.08], [0.25, -0.03], [0.47, -0.1], [0.67, -0.05], [0.16, -0.27], [0.38, -0.3], [0.6, -0.28], [-0.12, -0.18], [0.82, -0.25], [-0.1, -0.38]] as P[])
  .map(([x, y], i) => spiral(x, y, 0.055, 0.008, i * 1.3, 1.3, 26));

function catmull(pts: P[], step = 0.012): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(len / step));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)) as P);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** tous les tracés, dans l'ordre où ils se dessinent ; `w` = épaisseur relative */
export const RAM_STROKES: { pts: P[]; w: number; curl?: boolean }[] = [
  { pts: catmull(OUTLINE), w: 1.6 },
  { pts: catmull(HORN, 0.008), w: 2.4 },
  { pts: catmull(HORN_IN, 0.008), w: 1.0 },
  { pts: catmull(EAR), w: 1.0 },
  { pts: catmull(MOUTH, 0.006), w: 0.8 },
  ...CURLS.map(c => ({ pts: catmull(c, 0.008), w: 0.8, curl: true })),
];
export const RAM_EYE: P = [1.2, 0.04];
/** longueur cumulée totale (pour animer le tracé) */
export const RAM_LENGTH = RAM_STROKES.reduce((a, s) => a + s.pts.length, 0);
