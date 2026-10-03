import * as THREE from 'three';
import { translucentMaterial } from '../../shaders/translucent';
import { rng } from '../../utils/math';

type Rng = ReturnType<typeof rng>;

/** Un organisme : un objet 3D et sa petite vie (dérive, rotation, battements). */
export interface Organism { object: THREE.Object3D; update(t: number, dt: number): void }

/** Points répartis sur une sphère (spirale de Fibonacci), pour les colonies et les cils. */
function fibonacciSphere(n: number, r: number) {
  const pts: THREE.Vector3[] = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), a = i * g; pts.push(new THREE.Vector3(Math.cos(a) * rad * r, y * r, Math.sin(a) * rad * r)); }
  return pts;
}

/** Volvox : une sphère creuse faite de centaines de petites cellules vertes, des colonies filles à l'intérieur. Elle roule lentement. */
export function volvox(R: Rng, radius: number): Organism {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 30), translucentMaterial({ core: '#5d8f6c', rim: '#a9d8b2', opacity: 0.7 })));
  const cellGeo = new THREE.SphereGeometry(radius * 0.035, 6, 5), cellMat = translucentMaterial({ core: '#7fb48a', rim: '#cdeccf', opacity: 1.2 });
  const pts = fibonacciSphere(260, radius * 0.97), cells = new THREE.InstancedMesh(cellGeo, cellMat, pts.length), m = new THREE.Matrix4();
  pts.forEach((p, i) => cells.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  g.add(cells);
  for (let k = 0; k < 4; k++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(radius * R.range(0.18, 0.28), 20, 14), translucentMaterial({ core: '#4f8a5c', rim: '#9fd3a6', opacity: 1.1 }));
    d.position.set(R.gauss() * radius * 0.3, R.gauss() * radius * 0.3, R.gauss() * radius * 0.3); g.add(d);
  }
  const spin = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize(), speed = R.range(0.04, 0.09);
  return { object: g, update: (_t, dt) => { g.rotateOnAxis(spin, speed * dt); } };
}

/** Diatomée pennée : une petite navette de silice, striée. Elle glisse lentement le long de son axe. */
export function pennateDiatom(R: Rng, len: number): Organism {
  const geo = new THREE.CapsuleGeometry(len * 0.13, len, 6, 20);
  geo.rotateZ(Math.PI / 2); geo.scale(1, 1, 0.55);
  const m = new THREE.Mesh(geo, translucentMaterial({ core: '#b89a5a', rim: '#ead6a4', opacity: 0.9, stripes: 22 / len * 2 }));
  const chloro = new THREE.Mesh(new THREE.SphereGeometry(len * 0.11, 12, 8), translucentMaterial({ core: '#9a7a3a', rim: '#d8b878', opacity: 0.9 }));
  chloro.scale.set(2.4, 0.7, 0.6); m.add(chloro);
  const axis = new THREE.Vector3(R.gauss(), R.gauss() * 0.4, R.gauss()).normalize(), ph = R.next() * 6;
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
  return { object: m, update: (t, dt) => { m.position.addScaledVector(axis, Math.sin(t * 0.18 + ph) * 0.08 * dt); m.rotateY(dt * 0.01); } };
}

/** Diatomée centrique : une petite boîte ronde, des rayons et des cercles gravés. */
export function centricDiatom(R: Rng, r: number): Organism {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.35, 48, 1), translucentMaterial({ core: '#b59a62', rim: '#efdcae', opacity: 0.9, rays: 36 }));
  const spin = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize(), speed = R.range(0.05, 0.12);
  return { object: m, update: (_t, dt) => m.rotateOnAxis(spin, speed * dt) };
}

/** Paramécie : une pantoufle translucide couverte de cils qui battent en vagues. Elle avance doucement en spirale. */
export function paramecium(R: Rng, len: number): Organism {
  const g = new THREE.Group();
  const bodyGeo = new THREE.CapsuleGeometry(len * 0.2, len * 0.75, 8, 24);
  bodyGeo.rotateZ(Math.PI / 2);
  const pos = bodyGeo.attributes.position;                 // forme de pantoufle : un côté creusé (sillon oral)
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setY(i, y * (1 - 0.18 * Math.exp(-((x + len * 0.1) ** 2) / (len * len * 0.05)) * (y > 0 ? 1 : 0))); pos.setZ(i, pos.getZ(i) * 0.8); }
  bodyGeo.computeVertexNormals();
  g.add(new THREE.Mesh(bodyGeo, translucentMaterial({ core: '#88a99a', rim: '#d4ebe0', opacity: 0.85 })));
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(len * 0.11, 14, 10), translucentMaterial({ core: '#7c9488', rim: '#bcd6c8', opacity: 1 }));
  nucleus.scale.set(1.5, 1, 1); g.add(nucleus);
  for (const s of [-1, 1]) { const v = new THREE.Mesh(new THREE.SphereGeometry(len * 0.05, 10, 8), translucentMaterial({ core: '#9ec7d0', rim: '#e4f4f6', opacity: 1 })); v.position.x = s * len * 0.3; g.add(v); }
  // cils : des segments normaux à la surface, animés dans le shader (vague qui court le long du corps)
  const n = 520, cpos = new Float32Array(n * 6), cdir = new Float32Array(n * 6), cph = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const u = R.range(-0.5, 0.5) * len * 1.05, a = R.next() * Math.PI * 2, rr = len * 0.2 * Math.sqrt(Math.max(0, 1 - (2 * u / (len * 1.05)) ** 4));
    const p = new THREE.Vector3(u, Math.cos(a) * rr, Math.sin(a) * rr * 0.8), nrm = new THREE.Vector3(0, Math.cos(a), Math.sin(a)).normalize();
    cpos.set([p.x, p.y, p.z, p.x, p.y, p.z], i * 6); cdir.set([0, 0, 0, nrm.x, nrm.y, nrm.z], i * 6); cph.set([u, u], i * 2);
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cpos, 3)); cg.setAttribute('aDir', new THREE.BufferAttribute(cdir, 3)); cg.setAttribute('aPh', new THREE.BufferAttribute(cph, 1));
  const cmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uLen: { value: len * 0.09 } },
    vertexShader: `attribute vec3 aDir; attribute float aPh; uniform float uTime, uLen; varying float vA;
      void main(){ float wave = sin(aPh * 6.0 - uTime * 7.0); vec3 tangent = vec3(1.0, 0.0, 0.0); vec3 p = position + (aDir + tangent * wave * 0.6) * uLen;
        vA = length(aDir); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.75, 0.88, 0.82) * 0.35 * (1.0 - vA * 0.6), 1.0); }`,
  });
  g.add(new THREE.LineSegments(cg, cmat));
  const heading = new THREE.Vector3(R.gauss(), R.gauss() * 0.3, R.gauss()).normalize(), ph = R.next() * 10;
  g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), heading);
  return {
    object: g,
    update: (t, dt) => {
      cmat.uniforms.uTime.value = t;
      g.rotateX(dt * 0.5);                                   // elle tourne sur elle-même en nageant
      g.rotateY(Math.sin(t * 0.2 + ph) * dt * 0.08);
      const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(g.quaternion);
      g.position.addScaledVector(fwd, 0.22 * dt);
    },
  };
}

/** Radiolaire : une petite étoile de verre, des épines très fines. */
export function radiolarian(R: Rng, r: number): Organism {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), translucentMaterial({ core: '#a4a8c4', rim: '#e6e8f6', opacity: 0.8 })));
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.55, 1), translucentMaterial({ core: '#c0a67a', rim: '#f0dfbd', opacity: 0.8 })));
  const pts = fibonacciSphere(70, 1), arr = new Float32Array(pts.length * 6);
  pts.forEach((p, i) => { const L = r * R.range(1.6, 2.4); arr.set([p.x * r, p.y * r, p.z * r, p.x * L, p.y * L, p.z * L], i * 6); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#d9dcef', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })));
  const spin = new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize();
  return { object: g, update: (_t, dt) => g.rotateOnAxis(spin, dt * 0.05) };
}
