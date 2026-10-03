import * as THREE from 'three';
import { rng } from './math';

const cache = new Map<string, THREE.Texture>();

/** Disque doux (sprite de particule / bokeh), partagé. */
export function softDisc(size = 128, hardness = 0.0): THREE.Texture {
  const key = `disc:${size}:${hardness}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(Math.min(0.95, 0.15 + hardness * 0.8), 'rgba(255,255,255,0.85)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/**
 * Toile de fond « ville floue la nuit » : bokeh chauds et froids, halo du lampadaire.
 * Sert à la fois de fond opaque dans la goutte (pour que la transmission réfracte quelque chose) et d'environnement.
 */
export function bokehBackdrop(width = 1024, height = 512, seed = 7): THREE.CanvasTexture {
  const R = rng(seed);
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#04070e');
  bg.addColorStop(0.55, '#0a1424');
  bg.addColorStop(1, '#070b14');
  g.fillStyle = bg;
  g.fillRect(0, 0, width, height);
  // le lampadaire : un grand halo chaud en haut à droite
  const lamp = g.createRadialGradient(width * 0.72, height * 0.18, 0, width * 0.72, height * 0.18, height * 0.55);
  lamp.addColorStop(0, 'rgba(255,214,150,0.95)');
  lamp.addColorStop(0.08, 'rgba(255,190,110,0.55)');
  lamp.addColorStop(0.4, 'rgba(160,110,60,0.12)');
  lamp.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lamp;
  g.fillRect(0, 0, width, height);
  // lumières de la ville, très floues
  for (let i = 0; i < 95; i++) {
    const x = R.next() * width, y = height * R.range(0.25, 0.85), r = R.range(14, 64);
    const warm = R.next() < 0.55;
    const col = warm ? `rgba(255,${Math.floor(R.range(150, 200))},${Math.floor(R.range(80, 120))},` : `rgba(${Math.floor(R.range(110, 160))},${Math.floor(R.range(150, 190))},255,`;
    const d = g.createRadialGradient(x, y, 0, x, y, r);
    const a = R.range(0.18, 0.55);
    d.addColorStop(0, col + a + ')');
    d.addColorStop(0.7, col + a * 0.6 + ')');
    d.addColorStop(1, col + '0)');
    g.fillStyle = d;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
