/*
 * Le Capo : un jeu de rythme dans un stade. La justesse des frappes nourrit la « ferveur » de la tribune,
 * qui pilote tout le reste : bonds, bras levés, ola, fumigènes, confettis, tifo et le HOURRA final.
 * La foule (plusieurs milliers de supporters) est un seul InstancedMesh animé dans le vertex shader.
 */
import * as THREE from 'three';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mobile = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05060c); scene.fog = new THREE.Fog(0x05060c, 45, 110);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300); scene.add(camera);
const CAM = new THREE.Vector3(0, 2.6, -7), LOOK = new THREE.Vector3(0, 7, -32);

/* ------------------------------------------------------------------ stade */
const R0 = 22, ROWS = 20, DR = 0.86, DH = 0.5, SEAT = 0.62;
{
  const prof = [new THREE.Vector2(R0 - 1.2, 0), new THREE.Vector2(R0 - 1.2, 1.1), new THREE.Vector2(R0 - 0.5, 1.1)];
  for (let i = 0; i < ROWS; i++) { const r = R0 - 0.5 + i * DR, h = 1.1 + i * DH; prof.push(new THREE.Vector2(r + DR, h), new THREE.Vector2(r + DR, h + DH)); }
  const top = prof[prof.length - 1]; prof.push(new THREE.Vector2(top.x + 0.6, top.y), new THREE.Vector2(top.x + 0.6, top.y + 3.5));
  const stand = new THREE.Mesh(new THREE.LatheGeometry(prof, 160), new THREE.MeshStandardMaterial({ color: 0x3b3f4a, roughness: 0.9, side: THREE.DoubleSide }));
  scene.add(stand);
  // toit : anneau incliné, et sa rangée de projecteurs
  const roofIn = R0 + ROWS * DR - 4, roofY = 1.1 + ROWS * DH + 5.5;
  const roof = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(roofIn, roofY), new THREE.Vector2(top.x + 2, roofY + 2.4)], 160), new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.8, side: THREE.DoubleSide }));
  scene.add(roof);
  const n = 220, lp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; lp.set([Math.cos(a) * (roofIn + 0.3), roofY - 0.2, Math.sin(a) * (roofIn + 0.3)], i * 3); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xfff6e0, size: 0.9, map: softDot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  // pelouse rayée
  const pc = document.createElement('canvas'); pc.width = 512; pc.height = 512; const px = pc.getContext('2d');
  for (let i = 0; i < 16; i++) { px.fillStyle = i % 2 ? '#2f7a34' : '#36873b'; px.fillRect(0, i * 32, 512, 32); }
  px.strokeStyle = 'rgba(255,255,255,.85)'; px.lineWidth = 4; px.strokeRect(40, 30, 432, 452); px.beginPath(); px.moveTo(40, 256); px.lineTo(472, 256); px.stroke(); px.beginPath(); px.arc(256, 256, 60, 0, 7); px.stroke(); px.strokeRect(156, 30, 200, 80); px.strokeRect(156, 402, 200, 80);
  const pitch = new THREE.Mesh(new THREE.CircleGeometry(R0 - 1.2, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pc), roughness: 0.95 }));
  pitch.material.map.colorSpace = THREE.SRGBColorSpace; pitch.rotation.y = Math.PI / 2; scene.add(pitch);
  // banderole sur la balustrade de la tribune d'en face
  const bc = document.createElement('canvas'); bc.width = 2048; bc.height = 96; const bx = bc.getContext('2d');
  bx.fillStyle = '#c8102e'; bx.fillRect(0, 0, 2048, 96); bx.fillStyle = '#f2b705'; bx.fillRect(0, 0, 2048, 10); bx.fillRect(0, 86, 2048, 10);
  bx.fillStyle = '#fff'; bx.font = '64px Anton, Impact, sans-serif'; bx.textAlign = 'center'; bx.textBaseline = 'middle';
  ['VIRAGE NORD', '★', 'ON CHANTE POUR TOI', '★', 'JAMAIS SEULS', '★'].forEach((s, i) => bx.fillText(s, 170 + i * 340, 52));
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.CylinderGeometry(R0 - 1.15, R0 - 1.15, 0.9, 64, 1, true, Math.PI - 0.75, 1.5), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide }));
  banner.position.y = 0.6; banner.scale.x = -1; scene.add(banner);
  // pylônes d'éclairage
  for (const a of [0.8, 2.35, 3.95, 5.5]) {
    const r = R0 + ROWS * DR + 6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 36, 8), new THREE.MeshStandardMaterial({ color: 0x22252c })); mast.position.set(x, 18, z); scene.add(mast);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xfff3d6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); glow.position.set(x, 37, z); glow.scale.setScalar(16); scene.add(glow);
    const core = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff })); core.position.set(x, 37, z); core.lookAt(0, 0, 0); scene.add(core);
  }
}
scene.add(new THREE.HemisphereLight(0x8090b0, 0x203018, 0.9));
const key = new THREE.DirectionalLight(0xfff2dc, 2.2); key.position.set(10, 40, 20); scene.add(key);
function softDot() {
  if (softDot.t) return softDot.t; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (softDot.t = new THREE.CanvasTexture(c));
}

/* ------------------------------------------------------------------ la foule */
const TIFO = (() => {
  const W = 480, H = 80, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#c8102e'; x.fillRect(0, 0, W, H); x.fillStyle = '#f2b705'; x.fillRect(0, 0, W, 8); x.fillRect(0, H - 8, W, 8);
  x.fillStyle = '#ffffff'; x.font = '900 60px Arial Black, Impact, sans-serif'; x.textBaseline = 'middle';
  const tw = x.measureText('HOURRA').width; x.save(); x.translate(14, H / 2 + 2); x.scale((W - 28) / tw, 1); x.fillText('HOURRA', 0, 0); x.restore();
  const d = x.getImageData(0, 0, W, H).data;
  return { at(u, v) { const i = (Math.floor(clamp(v, 0, 0.999) * H) * W + Math.floor(clamp(u, 0, 0.999) * W)) * 4; return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]; } };
})();
const TIFO_C = -Math.PI / 2, TIFO_W = 0.78;
function fanGeometry() {
  const parts = [[new THREE.BoxGeometry(0.34, 0.5, 0.22).translate(0, 0.25, 0), 0], [new THREE.IcosahedronGeometry(0.12, 1).translate(0, 0.64, 0), 1],
    [new THREE.BoxGeometry(0.09, 0.4, 0.09).translate(-0.215, 0.31, 0), 2], [new THREE.BoxGeometry(0.09, 0.4, 0.09).translate(0.215, 0.31, 0), 3]];
  const pos = [], nor = [], part = [];
  for (const [g, k] of parts) { const ng = g.index ? g.toNonIndexed() : g; pos.push(...ng.attributes.position.array); nor.push(...ng.attributes.normal.array); for (let i = 0; i < ng.attributes.position.count; i++) part.push(k); }
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  return g;
}
const fans = []; {
  const step = mobile ? 2 : 1;
  for (let row = 0; row < ROWS; row++) {
    const r = R0 + row * DR + DR * 0.55, y = 1.1 + (row + 1) * DH, n = Math.floor(Math.PI * 2 * r / (SEAT * step));
    for (let k = 0; k < n; k++) {
      if (Math.random() < 0.05) continue;                    // quelques places vides
      const th = (k + (row % 2) * 0.5) / n * Math.PI * 2 + (Math.random() - 0.5) * 0.004;
      fans.push({ th, r: r + (Math.random() - 0.5) * 0.12, y, row });
    }
  }
}
const FN = fans.length, fg = fanGeometry();
{
  const aPos = new Float32Array(FN * 3), aYaw = new Float32Array(FN), aCol = new Float32Array(FN * 3), aTifo = new Float32Array(FN * 4), aRand = new Float32Array(FN), aTh = new Float32Array(FN);
  const PAL = [[0.78, 0.06, 0.18], [0.78, 0.06, 0.18], [0.78, 0.06, 0.18], [0.95, 0.72, 0.02], [0.95, 0.72, 0.02], [0.92, 0.92, 0.92], [0.1, 0.1, 0.12], [0.2, 0.25, 0.4]];
  fans.forEach((f, i) => {
    aPos.set([Math.cos(f.th) * f.r, f.y, Math.sin(f.th) * f.r], i * 3); aYaw[i] = Math.atan2(-Math.cos(f.th), -Math.sin(f.th));
    aCol.set(PAL[Math.floor(Math.random() * PAL.length)], i * 3); aRand[i] = Math.random(); aTh[i] = f.th;
    let d = Math.atan2(Math.sin(f.th - TIFO_C), Math.cos(f.th - TIFO_C));
    if (Math.abs(d) < TIFO_W) { const c = TIFO.at(0.5 - d / (2 * TIFO_W), 1 - f.row / (ROWS - 1)); aTifo.set([...c, 1], i * 4); }
  });
  fg.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3)); fg.setAttribute('aYaw', new THREE.InstancedBufferAttribute(aYaw, 1));
  fg.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3)); fg.setAttribute('aTifo', new THREE.InstancedBufferAttribute(aTifo, 4));
  fg.setAttribute('aRand', new THREE.InstancedBufferAttribute(aRand, 1)); fg.setAttribute('aTh', new THREE.InstancedBufferAttribute(aTh, 1));
  fg.instanceCount = FN;
}
const crowdU = { uWave: { value: 0 }, uWaveAmp: { value: 0 }, uJump: { value: 0 }, uBeat: { value: 0 }, uArms: { value: 0 }, uTifo: { value: 0 }, uFlash: { value: 0 }, uFogC: { value: scene.fog.color } };
const crowd = new THREE.Mesh(fg, new THREE.ShaderMaterial({
  uniforms: crowdU,
  vertexShader: /* glsl */ `
    attribute vec3 aPos; attribute float aYaw; attribute vec3 aCol; attribute vec4 aTifo; attribute float aRand; attribute float aTh; attribute float aPart;
    uniform float uWave, uWaveAmp, uJump, uBeat, uArms, uTifo;
    varying vec3 vCol; varying float vLight; varying float vFog; varying float vWave;
    void main() {
      vec3 p = position, n = normal;
      float d = mod(aTh - uWave + 3.14159265, 6.2831853) - 3.14159265;
      float wave = uWaveAmp * (exp(-d * d / 0.02) + 0.35 * step(d, 0.0) * exp(d * 6.0));
      float tifo = uTifo * aTifo.w;
      float jump = uJump * max(0.0, sin(uBeat * 6.2831853 - aRand * 1.2)) * step(0.25, aRand);
      float up = clamp(max(wave, tifo * 0.6), 0.0, 1.0);
      float arm = clamp(max(max(wave, tifo), uArms * step(0.45, aRand) * (0.7 + 0.3 * sin(uBeat * 6.2831853 + aRand * 9.0))), 0.0, 1.0);
      if (aPart > 1.5) {
        float s = aPart > 2.5 ? 1.0 : -1.0; vec3 piv = vec3(0.215 * s, 0.5, 0.0); vec3 q = p - piv;
        float a = s * arm * 2.75, c = cos(a), si = sin(a);
        q.xy = vec2(c * q.x - si * q.y, si * q.x + c * q.y); n.xy = vec2(c * n.x - si * n.y, si * n.x + c * n.y); p = piv + q;
      }
      p.y += up * 0.3 + jump * 0.2 - (1.0 - up) * 0.18 * step(aRand, 0.25);
      float cy = cos(aYaw), sy = sin(aYaw);
      p.xz = vec2(cy * p.x + sy * p.z, -sy * p.x + cy * p.z); n.xz = vec2(cy * n.x + sy * n.z, -sy * n.x + cy * n.z);
      vec3 w = aPos + p;
      vec3 L = normalize(vec3(0.0, 26.0, 0.0) - w);
      vLight = 0.32 + 0.75 * max(dot(n, L), 0.0) + 0.2 * max(n.y, 0.0);
      vec3 skin = mix(vec3(0.93, 0.74, 0.6), vec3(0.42, 0.27, 0.18), fract(aRand * 7.31));
      vec3 base = aPart > 0.5 && aPart < 1.5 ? skin : aCol;
      vCol = mix(base, aTifo.rgb, tifo * (aPart > 0.5 && aPart < 1.5 ? 0.85 : 1.0));
      vWave = wave;
      vec4 mv = viewMatrix * vec4(w, 1.0); vFog = smoothstep(45.0, 110.0, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uFogC; uniform float uFlash; varying vec3 vCol; varying float vLight; varying float vFog; varying float vWave;
    void main() { vec3 c = vCol * vLight * (1.0 + uFlash * 0.6 + vWave * 0.55); gl_FragColor = vec4(mix(c, uFogC, vFog), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
crowd.frustumCulled = false; scene.add(crowd);

/* ------------------------------------------------------------------ fumigènes, étincelles, confettis */
function particles(n, blending, opacity) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending, uniforms: { uMap: { value: softDot() }, uScale: { value: 400 } },
    vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vC; void main() { vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uMap; varying vec4 vC; void main() { float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vC.rgb, vC.a * a * ${opacity.toFixed(2)}); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
  return { list: [], n, g, pos, col, size, m };
}
const smoke = particles(1400, THREE.NormalBlending, 0.55), glow = particles(700, THREE.AdditiveBlending, 1.0);
function emit(sys, p) { sys.list.push(p); if (sys.list.length > sys.n) sys.list.shift(); }
function flushParticles(sys, dt) {
  sys.list = sys.list.filter(p => (p.t += dt) < p.life);
  sys.list.forEach((p, i) => {
    p.v.y += (p.g ?? 0) * dt; p.v.multiplyScalar(1 - (p.drag ?? 0) * dt); p.p.addScaledVector(p.v, dt);
    const k = p.t / p.life, a = p.fadeIn ? Math.min(1, k * 6) * (1 - k) : 1 - k;
    sys.pos.set([p.p.x, p.p.y, p.p.z], i * 3); sys.col.set([p.c.r, p.c.g, p.c.b, a * (p.a ?? 1)], i * 4); sys.size[i] = p.s0 + (p.s1 - p.s0) * k;
  });
  sys.g.setDrawRange(0, sys.list.length); for (const k of ['position', 'aCol', 'aSize']) sys.g.attributes[k].needsUpdate = true;
}
const flares = [];
function lightFlare(th, row) {
  const r = R0 + row * DR + 0.5, y = 1.1 + (row + 1) * DH + 1.0;
  flares.push({ p: new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r), t: 0, life: 5 + Math.random() * 3, col: Math.random() < 0.7 ? new THREE.Color(1, 0.18, 0.12) : new THREE.Color(1, 0.75, 0.2), acc: 0 });
}
const CONF = mobile ? 700 : 1400, confMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.18), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF);
confMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); confMesh.frustumCulled = false; scene.add(confMesh);
const confetti = []; const CCOL = [0xc8102e, 0xf2b705, 0xffffff, 0xc8102e, 0xf2b705];
function confettiBurst(n, center, spread) {
  for (let i = 0; i < n; i++) { if (confetti.length >= CONF) confetti.shift();
    confetti.push({ p: center.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * 3, (Math.random() - 0.5) * spread)), v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 5, (Math.random() - 0.5) * 3), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: 4 + Math.random() * 8, c: CCOL[Math.floor(Math.random() * CCOL.length)], t: 0 }); }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
function updateConfetti(dt) {
  for (const c of confetti) { c.t += dt; c.v.y = Math.max(-1.6, c.v.y - 6 * dt); c.v.x *= 1 - dt * 0.8; c.v.z *= 1 - dt * 0.8; c.p.addScaledVector(c.v, dt); c.p.x += Math.sin(c.t * c.w) * dt * 0.6; c.r.x += c.w * dt; c.r.y += c.w * 0.7 * dt; }
  for (let i = confetti.length - 1; i >= 0; i--) if (confetti[i].p.y < 0.05 || confetti[i].t > 14) confetti.splice(i, 1);
  for (let i = 0; i < CONF; i++) { const c = confetti[i]; if (!c) { _m.makeScale(0, 0, 0); confMesh.setMatrixAt(i, _m); continue; } _m.compose(c.p, _q.setFromEuler(c.r), _s); confMesh.setMatrixAt(i, _m); confMesh.setColorAt(i, _c.set(c.c)); }
  confMesh.instanceMatrix.needsUpdate = true; if (confMesh.instanceColor) confMesh.instanceColor.needsUpdate = true;
}
function firework(pos) {
  const col = new THREE.Color().setHSL(Math.random() < 0.5 ? 0.0 : 0.12, 1, 0.6);
  for (let i = 0; i < 70; i++) emit(glow, { p: pos.clone(), v: new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 4), c: col, t: 0, life: 1.4 + Math.random() * 0.6, s0: 0.5, s1: 0.15, g: -4, drag: 1.2 });
  boom(0.25);
}

/* ------------------------------------------------------------------ grosse caisse au premier plan */
const drum = new THREE.Group(); camera.add(drum);
{
  const dc = document.createElement('canvas'); dc.width = dc.height = 512; const x = dc.getContext('2d');
  x.fillStyle = '#f1ece0'; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill(); x.strokeStyle = '#c8102e'; x.lineWidth = 40; x.beginPath(); x.arc(256, 256, 220, 0, 7); x.stroke();
  x.fillStyle = '#c8102e'; x.font = '150px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('VN', 256, 270); x.fillStyle = '#f2b705'; x.font = '60px Anton, Impact'; x.fillText('★ ★ ★', 256, 130);
  const tx = new THREE.CanvasTexture(dc); tx.colorSpace = THREE.SRGBColorSpace;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.4, side: THREE.DoubleSide }));
  shell.rotation.x = Math.PI / 2; drum.add(shell);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 })); face.position.z = 0.25; drum.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 8, 40), new THREE.MeshStandardMaterial({ color: 0xd0c8b0, metalness: 0.8, roughness: 0.3 })); rim.position.z = 0.25; drum.add(rim);
  drum.position.set(0.95, -0.95, -2.4); drum.rotation.set(-0.5, -0.3, 0); drum.scale.setScalar(0.72);
  const dl = new THREE.PointLight(0xfff0d0, 1.6, 4, 1.5); dl.position.set(0, 0.8, 1.2); drum.add(dl);
}
const mallet = new THREE.Group(); camera.add(mallet);
{ const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a40 })); stick.position.y = 0.37; mallet.add(stick);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.9 })); head.position.y = 0.76; mallet.add(head);
  mallet.position.set(1.25, -1.2, -1.9); mallet.rotation.z = -0.35; }
let malletHit = 1;

/* ------------------------------------------------------------------ partition */
function buildChart() {
  const notes = [], phases = [], beats = []; let t = 0;
  const add = (bpm, bars, pattern, name, key) => {
    const b = 60 / bpm; phases.push({ t, name, key, bpm });
    for (let k = 0; k < bars; k++) { for (let q = 0; q < 4; q++) beats.push({ t: t + (k * 4 + q) * b, down: q === 0, key }); for (const x of pattern(k)) notes.push({ t: t + (k * 4 + x) * b, key, j: null }); }
    t += bars * 4 * b;
  };
  add(96, 6, () => [0, 1, 2, 3], 'Échauffement', 'warm');
  add(108, 8, k => (k % 2 ? [0, 1, 2, 2.5, 3] : [0, 1, 2, 3]), 'Allez, allez, allez !', 'chant');
  add(118, 8, k => [[0, 1, 2, 3], [0, 0.5, 1, 2, 3], [0, 1, 1.5, 2, 3], [0, 1, 2, 3, 3.5]][k % 4], 'La ola !', 'ola');
  add(128, 6, k => (k < 3 ? [0, 1, 2, 3] : k < 5 ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] : [0, 0.5, 1, 1.5, 2, 2.5, 3]), 'Le final', 'final');
  notes.push({ t, key: 'hourra', big: true, j: null }); phases.push({ t, name: 'HOURRA !', key: 'hourra' });
  return { notes, phases, beats, end: t + 6 };
}

/* ------------------------------------------------------------------ son */
let ac = null, master, muted = false, roarG, roarF;
function audio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(ac.destination);
  const b = ac.createBuffer(2, ac.sampleRate * 4, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.02) * 0.6; } }
  const s = ac.createBufferSource(); s.buffer = b; s.loop = true; roarF = ac.createBiquadFilter(); roarF.type = 'bandpass'; roarF.frequency.value = 700; roarF.Q.value = 0.5;
  roarG = ac.createGain(); roarG.gain.value = 0.08; s.connect(roarF); roarF.connect(roarG); roarG.connect(master); s.start();
}
const T0 = () => ac.currentTime;
function boom(v = 1, at = 0) {
  if (!ac || muted) return; const t = T0() + at, o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25); g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.55); noiseHit(0.05, 2000, 0.25 * v, t);
}
function noiseHit(d, f, v, t, q = 0.7, type = 'bandpass') {
  if (!ac || muted) return; const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2);
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
}
function tick(t, down) { if (!ac || muted) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = down ? 1500 : 1100; g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.06); }
function claps(t, n) { for (let i = 0; i < n; i++) noiseHit(0.06, 1300 + Math.random() * 900, 0.05, t + Math.random() * 0.025, 1.2); }
const VOWELS = { a: [760, 1250, 2500], e: [420, 2000, 2600], ou: [330, 820, 2300], o: [480, 900, 2500] };
function shout(syl, t, dur, v, roll = false) {
  if (!ac || muted) return; const out = ac.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(v, t + 0.05); out.gain.setValueAtTime(v, t + dur * 0.7); out.gain.exponentialRampToValueAtTime(0.0001, t + dur); out.connect(master);
  if (roll) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 26; lg.gain.value = v * 0.8; lfo.connect(lg); lg.connect(out.gain); lfo.start(t); lfo.stop(t + 0.18); }
  const [f1, f2, f3] = VOWELS[syl], bus = ac.createGain(); bus.gain.value = 0.5;
  [[f1, 6, 1], [f2, 8, 0.5], [f3, 10, 0.2]].forEach(([f, q, g]) => { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const gg = ac.createGain(); gg.gain.value = g * 2.2; bus.connect(bp); bp.connect(gg); gg.connect(out); });
  for (let i = 0; i < 14; i++) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = (i < 7 ? 120 : 210) * (1 + (Math.random() - 0.5) * 0.12); o.frequency.linearRampToValueAtTime(o.frequency.value * 0.94, t + dur); o.connect(bus); o.start(t); o.stop(t + dur + 0.05); }
  noiseHit(dur, f2, v * 0.4, t, 2);
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'muet' : 'son'; if (master) master.gain.value = muted ? 0 : 0.9; });

/* ------------------------------------------------------------------ jeu */
let chart = null, songStart = 0, st = -3, playing = false, manual = false, schedI = 0;
let E = 0.25, combo = 0, maxCombo = 0, perfect = 0, good = 0, miss = 0, judge = null, phaseI = -1, banner = null, finale = false, flash = 0, shake = 0;
let wave = -Math.PI / 2 - 1.2, waveAmp = 0;
function start() {
  audio(); chart = buildChart(); songStart = T0() + 3; st = -3; playing = true; schedI = 0; E = 0.25; combo = maxCombo = perfect = good = miss = 0; phaseI = -1; finale = false; judge = null;
  $('intro').hidden = true; $('end').hidden = true;
}
$('go').addEventListener('click', start);
function hit() {
  if (!playing) return; audio(); boom(1); malletHit = 0; flash = 0.25;
  const W_PERF = 0.075, W_GOOD = 0.15;
  let best = null, bd = 1;
  for (const n of chart.notes) { if (n.j) continue; const d = Math.abs(n.t - st); if (d < bd) { bd = d; best = n; } if (n.t > st + 0.3) break; }
  if (best && bd <= W_GOOD) {
    best.j = bd <= W_PERF ? 'p' : 'g'; combo++; maxCombo = Math.max(maxCombo, combo);
    if (best.j === 'p') { perfect++; E += 0.045; judge = { text: 'PARFAIT', c: '#f2b705', t: 0 }; } else { good++; E += 0.025; judge = { text: 'BIEN', c: '#ffffff', t: 0 }; }
    if (combo % 16 === 0 && E > 0.5) confettiBurst(220, new THREE.Vector3(0, 9, -28), 16);
    if (best.big) finalHourra();
  } else { E -= 0.02; combo = 0; judge = { text: 'À CÔTÉ', c: '#ff6b6b', t: 0 }; }
  E = clamp(E, 0, 1);
}
function finalHourra() {
  finale = true; const t = T0() + 0.05, ok = E > 0.55;
  shout('ou', t, 0.45, ok ? 0.9 : 0.25); shout('a', t + 0.42, 1.6, ok ? 1.0 : 0.3, true);
  if (ok) { for (let i = 0; i < 6; i++) setTimeout(() => firework(new THREE.Vector3((Math.random() - 0.5) * 50, 26 + Math.random() * 10, -20 - Math.random() * 30)), 300 + i * 380); confettiBurst(CONF, new THREE.Vector3(0, 12, -28), 40); }
  setTimeout(endScreen, 4200);
}
addEventListener('keydown', e => { if (['Space', 'Enter', 'KeyF', 'KeyJ'].includes(e.code)) { e.preventDefault(); if (!e.repeat) hit(); } });
$('c').addEventListener('pointerdown', e => { e.preventDefault(); hit(); });

function endScreen() {
  playing = false; const total = chart.notes.length, acc = Math.round((perfect + good * 0.6) / total * 100), ok = E > 0.55;
  const rank = acc >= 90 && ok ? 'Kop légendaire' : acc >= 75 && ok ? 'Tribune en fusion' : acc >= 55 ? 'Belle ambiance' : acc >= 35 ? 'Match amical' : 'Tribune muette';
  const best = Math.max(acc, +(localStorage.getItem('capo.best') || 0)); localStorage.setItem('capo.best', best);
  $('endCard').innerHTML = `<div class="kick">Coup de sifflet final</div><h1>${ok ? 'Hou<em>rra !</em>' : 'hourra…'}</h1>
    <p>${rank}. ${ok ? 'Cinquante mille voix ont répondu à ton tambour.' : 'Quelques voix ont répondu, mais la tribune est restée assise.'}</p>
    <div class="stats"><div><b>${acc} %</b>justesse</div><div><b>${perfect}</b>parfaits</div><div><b>${maxCombo}</b>meilleur combo</div><div><b>${best} %</b>record</div></div>
    <button class="btn" id="again" type="button">Rejouer le match</button>`;
  $('end').hidden = false; $('again').onclick = start;
}

/* ------------------------------------------------------------------ boucle */
function resize() {
  if (!innerWidth || !innerHeight) return; renderer.setSize(innerWidth, innerHeight, false);
  const portrait = innerWidth < innerHeight; camera.aspect = innerWidth / innerHeight; camera.fov = portrait ? 78 : 55; camera.updateProjectionMatrix();
  CAM.set(0, portrait ? 2.2 : 2.6, portrait ? -2 : -7);
  drum.position.set(portrait ? 0.42 : 0.95, portrait ? -1.45 : -0.95, -2.4); mallet.position.set(portrait ? 0.75 : 1.25, portrait ? -1.7 : -1.2, -1.9);
  const hud = $('hud'), d = Math.min(2, devicePixelRatio || 1); hud.width = innerWidth * d; hud.height = innerHeight * d; hud.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', resize); resize();
const hx = $('hud').getContext('2d');
let last = performance.now(), wall = 0;
function step(dt) {
  wall += dt;
  if (playing) {
    st = manual || !ac ? st + dt : T0() - songStart;
    // métronome-guide, claps, chants (programmés un peu en avance sur l'horloge audio)
    while (ac && schedI < chart.beats.length && chart.beats[schedI].t < st + 0.2) {
      const b = chart.beats[schedI++], at = songStart + b.t; if (at < T0()) continue;
      tick(at, b.down); if (E > 0.35) claps(at, Math.round(4 + E * 18));
      if (b.down && b.key === 'chant' && E > 0.4) { shout('a', at, 0.22, 0.25 + E * 0.35); shout('e', at + 0.24, 0.3, 0.25 + E * 0.35); }
      if (b.down && b.key === 'final' && E > 0.5) shout('o', at, 0.35, 0.2 + E * 0.3);
    }
    for (const n of chart.notes) { if (n.j || n.t > st - 0.15) continue; n.j = 'm'; miss++; combo = 0; E = clamp(E - 0.05, 0, 1); judge = { text: 'RATÉ', c: '#ff6b6b', t: 0 }; if (n.big) finalHourra(); }
    const pi = chart.phases.findLastIndex(p => p.t <= st);
    if (pi !== phaseI && pi >= 0) { phaseI = pi; banner = { text: chart.phases[pi].name, t: 0 }; }
    if (!finale) E = clamp(E - dt * 0.012, 0, 1);
  }
  const key = phaseI >= 0 && chart ? chart.phases[phaseI].key : 'warm';
  const bpm = phaseI >= 0 && chart && chart.phases[phaseI].bpm ? chart.phases[phaseI].bpm : 100;
  crowdU.uBeat.value = playing ? Math.max(0, st) * bpm / 60 : wall * 0.8;
  crowdU.uJump.value += ((playing ? sstep(0.35, 0.8, E) : 0.1) - crowdU.uJump.value) * dt * 2;
  crowdU.uArms.value += ((playing ? sstep(0.25, 0.7, E) : 0.15) - crowdU.uArms.value) * dt * 2;
  const waveOn = playing && ((['ola', 'final', 'hourra'].includes(key) && E > 0.4) || E > 0.8);
  waveAmp += ((waveOn ? sstep(0.4, 0.75, E) : 0) - waveAmp) * dt * 1.5; wave += dt * (0.9 + E * 0.9);
  crowdU.uWave.value = wave; crowdU.uWaveAmp.value = waveAmp;
  crowdU.uTifo.value += (((key === 'final' || key === 'hourra' || finale) && E > 0.55 ? 1 : 0) - crowdU.uTifo.value) * dt * 1.2;
  flash = Math.max(0, flash - dt * 2.5); crowdU.uFlash.value = flash * E;
  // fumigènes : la tribune s'allume quand la ferveur dépasse 60 %
  if (playing && E > 0.6 && Math.random() < dt * (E - 0.55) * 4 && flares.length < 14) lightFlare(-Math.PI / 2 + (Math.random() - 0.5) * 1.6, Math.floor(Math.random() * ROWS));
  for (let i = flares.length - 1; i >= 0; i--) {
    const f = flares[i]; f.t += dt; if (f.t > f.life) { flares.splice(i, 1); continue; }
    f.acc += dt; while (f.acc > 0.05) { f.acc -= 0.05;
      emit(smoke, { p: f.p.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6), c: f.col.clone().lerp(new THREE.Color(0.6, 0.55, 0.55), 0.35), t: 0, life: 5 + Math.random() * 2, s0: 0.8, s1: 5, drag: 0.4, fadeIn: true, a: 0.75 });
      emit(glow, { p: f.p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3)), v: new THREE.Vector3(0, 0.3, 0), c: f.col, t: 0, life: 0.18, s0: 2.6 + Math.random(), s1: 1.2 });
    }
  }
  flushParticles(smoke, dt); flushParticles(glow, dt); updateConfetti(dt);
  if (playing && roarG) { roarG.gain.setTargetAtTime(muted ? 0 : 0.05 + E * 0.32 + waveAmp * 0.08, T0(), 0.4); roarF.frequency.setTargetAtTime(500 + E * 700, T0(), 0.5); }
  // caméra : légère respiration, suit la ola, tremble sur les frappes
  malletHit = Math.min(1, malletHit + dt * 6); const mh = Math.sin(Math.min(1, malletHit) * Math.PI);
  mallet.rotation.x = -0.9 + (malletHit < 0.5 ? malletHit * 2 : 1) * 0.9 - (1 - malletHit) * 0.2; drum.scale.setScalar(0.72 * (1 + (1 - malletHit) * 0.03));
  shake = Math.max(0, shake - dt * 3) + (1 - malletHit) * 0.02;
  camera.position.copy(CAM).add(new THREE.Vector3(Math.sin(wall * 0.3) * 0.4, Math.sin(wall * 0.5) * 0.1 + (Math.random() - 0.5) * shake, 0));
  const wd = Math.atan2(Math.sin(wave + Math.PI / 2), Math.cos(wave + Math.PI / 2));
  const follow = waveAmp * clamp(wd, -0.6, 0.6) * 0.35;
  camera.lookAt(LOOK.x + Math.sin(follow) * 25, LOOK.y + (finale ? 2.5 : 0), LOOK.z);
  void mh;
}
function drawHUD() {
  const W = innerWidth, H = innerHeight; hx.clearRect(0, 0, W, H);
  if (!playing || !chart) return;
  // piste de notes
  const laneY = H - (W < 600 ? 150 : 120), hitX = Math.min(140, W * 0.2), pxs = Math.min(380, W * 0.55);
  hx.fillStyle = 'rgba(0,0,0,.45)'; hx.fillRect(0, laneY - 34, W, 68);
  hx.strokeStyle = 'rgba(255,255,255,.12)'; hx.lineWidth = 1;
  for (const b of chart.beats) { const x = hitX + (b.t - st) * pxs; if (x < -10 || x > W + 10) continue; hx.beginPath(); hx.moveTo(x, laneY - (b.down ? 34 : 18)); hx.lineTo(x, laneY + (b.down ? 34 : 18)); hx.stroke(); }
  const pulse = 1 + Math.max(0, 1 - malletHit * 3) * 0.25;
  hx.strokeStyle = '#ffffff'; hx.lineWidth = 4; hx.beginPath(); hx.arc(hitX, laneY, 24 * pulse, 0, 7); hx.stroke();
  for (const n of chart.notes) {
    const x = hitX + (n.t - st) * pxs; if (x < -40 || x > W + 40) continue;
    if (n.j === 'p' || n.j === 'g') continue;
    const r = n.big ? 30 : 17; hx.globalAlpha = n.j === 'm' ? 0.3 : 1;
    hx.fillStyle = n.big ? '#f2b705' : { warm: '#ffffff', chant: '#e0203a', ola: '#f2b705', final: '#ff5a2a' }[n.key] || '#fff';
    hx.beginPath(); hx.arc(x, laneY, r, 0, 7); hx.fill(); hx.fillStyle = 'rgba(0,0,0,.35)'; hx.beginPath(); hx.arc(x, laneY, r * 0.45, 0, 7); hx.fill(); hx.globalAlpha = 1;
  }
  if (st < 0) { hx.fillStyle = '#fff'; hx.font = `400 ${Math.min(120, W * 0.2)}px Anton, Impact, sans-serif`; hx.textAlign = 'center'; hx.fillText(String(Math.ceil(-st)), W / 2, H * 0.42); }
  if (judge) { judge.t += 1 / 60; const a = 1 - judge.t / 0.6; if (a > 0) { hx.globalAlpha = a; hx.fillStyle = judge.c; hx.font = '400 26px Anton, Impact, sans-serif'; hx.textAlign = 'center'; hx.fillText(judge.text, hitX, laneY - 48 - judge.t * 30); hx.globalAlpha = 1; } }
  // ferveur et combo
  const bw = Math.min(360, W - 180), bx = (W - bw) / 2, by = W < 600 ? 66 : 22;
  hx.fillStyle = 'rgba(0,0,0,.5)'; hx.fillRect(bx, by, bw, 12);
  const grd = hx.createLinearGradient(bx, 0, bx + bw, 0); grd.addColorStop(0, '#f2b705'); grd.addColorStop(1, '#e0203a'); hx.fillStyle = grd; hx.fillRect(bx, by, bw * E, 12);
  hx.fillStyle = '#fff'; hx.font = '800 11px Barlow, sans-serif'; hx.textAlign = 'left'; hx.fillText('FERVEUR', bx, by + 28); hx.textAlign = 'right'; hx.fillText(combo > 2 ? `COMBO ×${combo}` : '', bx + bw, by + 28);
  if (banner) { banner.t += 1 / 60; const a = banner.t < 0.3 ? banner.t / 0.3 : Math.max(0, 1 - (banner.t - 2) / 0.6); if (a > 0) { hx.globalAlpha = a; hx.fillStyle = '#fff'; hx.font = `400 ${Math.min(72, W * 0.11)}px Anton, Impact, sans-serif`; hx.textAlign = 'center'; hx.shadowColor = 'rgba(0,0,0,.6)'; hx.shadowBlur = 20; hx.fillText(banner.text.toUpperCase(), W / 2, H * 0.3); hx.shadowBlur = 0; hx.globalAlpha = 1; } }
}
function frame(now) { requestAnimationFrame(frame); step(Math.min(0.05, (now - last) / 1000)); last = now; renderer.render(scene, camera); drawHUD(); }
requestAnimationFrame(frame);
window.capo = {
  start, hit, get E() { return E; }, set E(v) { E = v; }, get st() { return st; },
  advance(sec, autoplay = true) { manual = true; for (let s = 0; s < sec; s += 1 / 60) { step(1 / 60); if (autoplay && playing) { const n = chart.notes.find(n => !n.j && Math.abs(n.t - st) < 0.01); if (n) hit(); } } renderer.render(scene, camera); drawHUD(); return { st, E, combo, perfect, miss, fans: FN }; },
};
