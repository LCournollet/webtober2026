/** Générateur pseudo-aléatoire déterministe (mulberry32) : chaque scène reste identique d'une visite à l'autre. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a0: number, b0: number) => a0 + (b0 - a0) * next(),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    /** gaussienne approchée (somme de 4 uniformes), centrée, écart-type ≈ 1 */
    gauss: () => (next() + next() + next() + next() - 2) / 0.577,
  };
}

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** amortissement exponentiel indépendant du framerate */
export const damp = (current: number, target: number, lambda: number, dt: number) => current + (target - current) * (1 - Math.exp(-lambda * dt));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
