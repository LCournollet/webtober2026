/*
 * Fragile : un vélo cargo, un colis, une ville. Chaque choc peut casser quelque chose dans la boîte.
 * On n'en voit rien pendant la course : on l'entend seulement. Le client ouvre le carton à l'arrivée.
 */
(() => {
  const $ = id => document.getElementById(id);
  const cv = $('c'), g = cv.getContext('2d');
  const rand = (a, b) => a + Math.random() * (b - a), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ------------------------------------------------------------------ colis */
  const PKGS = [
    { id: 'the', opener: 'Mamie Ginette ouvre le colis', title: 'Le service à thé de Mamie Ginette', to: 'Ginette Lemaire · 12 rue des Lilas, 3e sans ascenseur', what: '1 théière, 1 sucrier, 1 pot à lait, 4 tasses, 4 soucoupes (porcelaine de Limoges, 1962)', sound: 'porcelain',
      items: [['teapot', 'la théière', .55], ['sugar', 'le sucrier', .5], ['jug', 'le pot à lait', .46], ...[1, 2, 3, 4].map(() => ['cup', 'une tasse', .38]), ...[1, 2, 3, 4].map(() => ['saucer', 'une soucoupe', .42])],
      lines: ['Le service de maman est intact. J’en pleure de joie.', 'Il manque des tasses… on boira à tour de rôle.', 'Mamie Ginette va s’en souvenir longtemps. Vous aussi.'] },
    { id: 'oeufs', opener: 'Le boulanger ouvre le colis', title: 'Une douzaine d’œufs extra-frais', to: 'Boulangerie Fournil & Fils · 4 place du Marché', what: '12 œufs de poules élevées en plein air, calibre gros', sound: 'egg',
      items: Array.from({ length: 12 }, () => ['egg', 'un œuf', .3]),
      lines: ['Douze œufs, douze survivants. Respect.', 'On fera une omelette avec les blessés.', 'Merci pour l’omelette. J’avais commandé des œufs.'] },
    { id: 'bubulle', opener: 'Léo ouvre le colis', title: 'Bubulle et son aquarium', to: 'Léo, 7 ans · 28 avenue des Tilleuls', what: '1 aquarium de 20 L (rempli), 1 poisson rouge nommé Bubulle, 1 château en résine', sound: 'water',
      items: [['tank', 'l’aquarium', .36, 2], ['castle', 'le château', .62]],
      lines: ['Bubulle a adoré la balade !', 'Bubulle a un peu le mal de mer, mais ça va.', 'Bubulle a fini le voyage dans une flaque. Léo ne vous parle plus.'] },
    { id: 'cristal', opener: 'Les mariées ouvrent le colis', title: 'Les flûtes en cristal du mariage', to: 'Chloé & Inès · Salle des fêtes, 1 rue de la Mairie', what: '8 flûtes à champagne et 1 carafe, cristal taillé', sound: 'glass',
      items: [...Array.from({ length: 8 }, () => ['flute', 'une flûte', .32]), ['carafe', 'la carafe', .45]],
      lines: ['Les mariées trinqueront en cristal. Merci !', 'Quelques invités boiront dans des gobelets.', 'Il paraît que le verre brisé porte bonheur. Beaucoup de bonheur, alors.'] },
  ];
  let pkgIndex = +(localStorage.getItem('fragile.next') || 0) % PKGS.length, pkg, items;

  /* ------------------------------------------------------------------ monde */
  const L = 30000, VMAX = 600, BX = 260, GROUND = 612, TARGET = 80;
  let course, buildings, props, pigeons;
  function buildCourse() {
    course = []; let x = 1100;
    while (x < L - 700) {
      const r = Math.random();
      if (r < 0.13) { const len = rand(500, 900); course.push({ type: 'paves', x, len }); x += len + rand(450, 800); continue; }
      const type = r < 0.45 ? 'nid' : r < 0.68 ? 'dos' : r < 0.82 ? 'rails' : r < 0.93 ? 'plaque' : 'bordure';
      course.push({ type, x, sev: { nid: 1, dos: 1.3, rails: 0.75, plaque: 0.65, bordure: 1.6 }[type], hit: 0 });
      x += rand(380, 880);
    }
    buildings = []; let bx = -600, k = 0;
    while (bx < (L + 2400) * 0.92) { const w = 170 + Math.floor(hash(k * 3.1) * 160); buildings.push({ x: bx, w, h: 250 + hash(k * 7.7) * 170, k }); bx += w; k++; }
    props = []; for (let px = -400; px < L + 2000; px += 300) props.push({ x: px + rand(-40, 40), type: Math.random() < 0.55 ? 'tree' : 'lamp' });
    pigeons = []; for (let i = 0; i < 26; i++) { const px = rand(1500, L - 1500); for (let j = 0; j < 3; j++) pigeons.push({ x: px + j * rand(14, 26), y: GROUND - rand(-14, 6), vx: 0, vy: 0, fly: false, ph: Math.random() * 6 }); }
  }
  const BCOL = ['#e8dcc4', '#ddcfb2', '#efe4cf', '#d8c4a4', '#e6d6bb', '#cdbb9b'];
  const SHOPS = [['BOULANGERIE', '#7a2f2a'], ['CAFÉ DU COIN', '#1f4f3d'], ['TABAC', '#a8322a'], ['PHARMACIE', '#2f7a46'], ['FLEURS', '#6a3f7a'], ['LIBRAIRIE', '#24406b'], ['FROMAGERIE', '#8a6420'], ['QUINCAILLERIE', '#3d3d3d'], ['BISTROT', '#7a1f2a'], ['PRESSING', '#2a6a8a']];

  /* ------------------------------------------------------------------ état */
  let state = 'intro', cam = 0, v = 0, t = 0, pedal = false, brake = false, crank = 0, arriveT = 0, revealT = 0;
  const box = { y: 0, vy: 0, r: 0, vr: 0 }; let bikeJ = 0, bikeJv = 0;
  let captions = [], pavTick = 0, ended = false;

  function newRun() {
    pkg = PKGS[pkgIndex]; buildCourse();
    items = pkg.items.map(([kind, name, tough, big]) => ({ kind, name, tough, big: big || 1, hp: 1, seed: Math.random() * 1000 }));
    cam = 0; v = 0; t = 0; arriveT = 0; revealT = 0; ended = false; captions = []; box.y = box.vy = box.r = box.vr = 0;
    state = 'ride'; $('intro').hidden = true; $('end').hidden = true;
  }
  function showIntro() {
    pkg = PKGS[pkgIndex]; $('pkgTitle').textContent = pkg.title; $('pkgTo').textContent = pkg.to; $('pkgWhat').textContent = pkg.what;
    $('intro').hidden = false; $('end').hidden = true; state = 'intro'; if (!course) buildCourse();
  }

  /* ------------------------------------------------------------------ chocs et casse */
  const ONO = { porcelain: ['CLING !', 'CRAC', 'TCHING', 'CRRRAC'], egg: ['SPLOTCH', 'CROC', 'SPLATCH', 'crac…'], water: ['GLOUP', 'SPLASH', 'CRAC', 'plic… plic…'], glass: ['TIIING', 'CRISH', 'CLING !', 'KRSSH'] };
  function shock(e, quiet) {
    box.vy -= 160 * e + 20; box.vr += rand(-1, 1) * 2.4 * e; bikeJv -= 90 * e;
    if (!quiet) thud(e);
    let broke = 0;
    for (const it of [...items].sort(() => Math.random() - 0.5)) {
      if (it.hp <= 0 || broke >= 2) continue;
      const p = clamp((e - it.tough) * 1.6, 0, 0.9);
      if (Math.random() < p) {
        it.hp -= rand(0.5, 1.1); broke++;
        breakSound(pkg.sound, it.hp <= 0);
        captions.push({ text: ONO[pkg.sound][Math.floor(Math.random() * 4)], x: BX + 130 + rand(-30, 30), y: 430, life: 0, big: it.hp <= 0 });
      }
    }
  }

  /* ------------------------------------------------------------------ son */
  let ac = null, master, muted = false, amb;
  function audio() {
    if (ac) return; ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    const b = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate), d = b.getChannelData(0); let l = 0;
    for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.2; }
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    amb = ac.createGain(); amb.gain.value = 0.07; s.connect(f); f.connect(amb); amb.connect(master); s.start();
  }
  function tone(fr, dur, vol, type = 'sine', slide = 1, at = 0) {
    if (!ac || muted) return; const t0 = ac.currentTime + at, o = ac.createOscillator(), gg = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(fr, t0); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(fr * slide, t0 + dur);
    gg.gain.setValueAtTime(vol, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(gg); gg.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, freq, vol, q = 0.8, type = 'bandpass', at = 0) {
    if (!ac || muted) return; const t0 = ac.currentTime + at, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2.5);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gg = ac.createGain(); s.buffer = b; f.type = type; f.frequency.value = freq; f.Q.value = q; gg.gain.value = vol;
    s.connect(f); f.connect(gg); gg.connect(master); s.start(t0);
  }
  function thud(e) { tone(90, 0.18, 0.25 * Math.min(1.3, e + 0.2), 'sine', 0.5); noise(0.12, 300, 0.25 * e); noise(0.08, 2400, 0.06 * e, 1.5, 'bandpass', 0.02); }
  function breakSound(kind, total) {
    const n = total ? 6 : 3;
    if (kind === 'porcelain') { for (let i = 0; i < n; i++) tone(rand(2200, 5200), rand(0.08, 0.3), 0.07, 'sine', 1, i * rand(0.02, 0.05)); noise(total ? 0.35 : 0.12, 4500, 0.18, 1.2); }
    if (kind === 'glass') { for (let i = 0; i < n + 3; i++) tone(rand(3500, 8000), rand(0.15, 0.6), 0.05, 'sine', 1, i * rand(0.01, 0.04)); noise(total ? 0.5 : 0.2, 7000, 0.16, 0.7, 'highpass'); }
    if (kind === 'egg') { noise(0.06, 2500, 0.2, 2); noise(0.25, 500, 0.35, 1.5, 'lowpass', 0.04); tone(180, 0.12, 0.1, 'sine', 0.6, 0.04); }
    if (kind === 'water') { noise(0.1, 3500, 0.15, 2); if (total) { noise(0.9, 800, 0.4, 0.6, 'lowpass', 0.05); for (let i = 0; i < 5; i++) tone(rand(500, 900), 0.08, 0.06, 'sine', 1.8, 0.2 + i * 0.12); } else tone(600, 0.1, 0.07, 'sine', 1.6, 0.05); }
  }
  let tickAcc = 0;
  function freewheel(dt) { if (pedal || v < 30) return; tickAcc += dt * v / 22; while (tickAcc > 1) { tickAcc -= 1; noise(0.015, 5200, 0.025, 4); } }
  $('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'muet' : 'son'; if (master) master.gain.value = muted ? 0 : 0.9; });

  /* ------------------------------------------------------------------ commandes */
  const ptrs = new Map();
  function readPtrs() { pedal = keys.pedal; brake = keys.brake; for (const side of ptrs.values()) side === 'b' ? (brake = true) : (pedal = true); }
  const keys = { pedal: false, brake: false };
  cv.addEventListener('pointerdown', e => { audio(); ptrs.set(e.pointerId, e.clientX < innerWidth * 0.4 ? 'b' : 'p'); readPtrs(); });
  addEventListener('pointerup', e => { ptrs.delete(e.pointerId); readPtrs(); });
  addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); readPtrs(); });
  addEventListener('blur', () => { ptrs.clear(); keys.pedal = keys.brake = false; readPtrs(); });
  const PK = ['ArrowRight', 'KeyD', 'Space', 'ArrowUp'], BK = ['ArrowLeft', 'KeyA', 'KeyS', 'ArrowDown'];
  addEventListener('keydown', e => { if (PK.includes(e.code)) keys.pedal = true; else if (BK.includes(e.code)) keys.brake = true; else return; audio(); e.preventDefault(); readPtrs(); });
  addEventListener('keyup', e => { if (PK.includes(e.code)) keys.pedal = false; if (BK.includes(e.code)) keys.brake = false; readPtrs(); });
  $('go').addEventListener('click', () => { audio(); newRun(); });

  /* ------------------------------------------------------------------ simulation */
  function step(dt) {
    t += state === 'ride' ? dt : 0;
    if (state === 'ride') {
      const arriving = cam >= L;
      if (arriving) v = Math.max(0, v - 520 * dt);
      else {
        if (pedal && !brake) v += (300 * (1 - v / VMAX) + 30) * dt;
        if (brake) v -= 700 * dt; else if (!pedal) v -= 45 * dt;
        v = clamp(v, 0, VMAX);
      }
      cam += v * dt; crank += (pedal && !arriving ? v / 38 + 2 : 0) * dt;
      if (arriving && v === 0) { arriveT += dt; if (arriveT > 0.7) { state = 'open'; revealT = 0; doorbell(); } }
      // chocs : roue avant (sous le colis) puis roue arrière
      const front = cam + 210;
      for (const o of course) {
        if (o.type === 'paves') {
          if (front > o.x && front < o.x + o.len) { pavTick -= dt; if (pavTick <= 0) { pavTick = 0.13; const e = 0.72 * (v / VMAX) ** 2; box.vy -= 30 * e + 4; bikeJv -= 30 * e; if (v > 40) noise(0.04, 900, 0.05 + e * 0.12); if (e > 0.25) shock(e * 0.75, true); } }
          continue;
        }
        if (o.hit === 0 && front >= o.x) { o.hit = 1; shock(o.sev * (v / VMAX) ** 2); }
        if (o.hit === 1 && cam >= o.x) { o.hit = 2; shock(o.sev * 0.35 * (v / VMAX) ** 2, v < 120); }
      }
      freewheel(dt);
      if (amb) amb.gain.value = 0.05 + (v / VMAX) * 0.06;
    }
    if (state === 'open') { revealT += dt; if (revealT > 1.4 + items.length * 0.28 + 0.6 && !ended) finish(); }
    // ressorts du colis et du vélo
    box.vy += (-180 * box.y - 9 * box.vy) * dt; box.y += box.vy * dt;
    box.vr += (-220 * box.r - 8 * box.vr) * dt; box.r += box.vr * dt; box.r = clamp(box.r, -0.25, 0.25);
    bikeJv += (-400 * bikeJ - 22 * bikeJv) * dt; bikeJ += bikeJv * dt;
    for (const p of pigeons) {
      if (!p.fly && p.x - cam - 210 < 140 && p.x - cam > -60 && v > 20) { p.fly = true; p.vx = rand(-60, 160); p.vy = rand(-260, -180); if (Math.random() < 0.3) noise(0.3, 1800, 0.05, 0.6); }
      if (p.fly) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
    }
    captions = captions.filter(c => (c.life += dt) < 1.4);
  }
  function doorbell() { tone(880, 0.6, 0.12, 'sine'); tone(698, 0.9, 0.12, 'sine', 1, 0.35); }

  /* ------------------------------------------------------------------ fin */
  function finish() {
    ended = true;
    const broken = items.filter(i => i.hp <= 0).length, cracked = items.filter(i => i.hp > 0 && i.hp < 1).length, n = items.length;
    const ratio = (broken + cracked * 0.4) / n, late = Math.max(0, t - TARGET);
    let stars = clamp(Math.round(5 - ratio * 5 - Math.min(2, late / 12)), 1, 5);
    if (pkg.id === 'bubulle' && items[0].hp <= 0) stars = 1;
    const line = pkg.lines[ratio === 0 ? 0 : ratio < 0.5 && !(pkg.id === 'bubulle' && items[0].hp <= 0) ? 1 : 2];
    const time = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    $('endCard').innerHTML = `<div class="stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
      <p class="review">« ${line}${late > 0 ? ` Et vous aviez ${Math.round(late)} s de retard.` : ''} »</p>
      <p><b>${n - broken - cracked}</b> intact${n - broken - cracked > 1 ? 's' : ''} · <b>${cracked}</b> fêlé${cracked > 1 ? 's' : ''} · <b>${broken}</b> cassé${broken > 1 ? 's' : ''} · livré en ${time} (promis en ${Math.floor(TARGET / 60)}:${String(TARGET % 60).padStart(2, '0')})</p>
      <div class="row"><button class="btn" id="again" type="button">Retenter ce colis</button><button class="btn" id="next" type="button">Colis suivant</button></div>`;
    $('end').hidden = false;
    $('again').onclick = () => newRun();
    $('next').onclick = () => { pkgIndex = (pkgIndex + 1) % PKGS.length; localStorage.setItem('fragile.next', pkgIndex); showIntro(); };
    const bestKey = 'fragile.best.' + pkg.id; if (stars > +(localStorage.getItem(bestKey) || 0)) localStorage.setItem(bestKey, stars);
    if (broken) tone(330, 0.5, 0.08, 'triangle', 0.7);
  }

  /* ------------------------------------------------------------------ dessin : ville */
  let S = 1, VW = 1280, VH = 720, OY = 0;
  function resize() {
    if (!innerWidth || !innerHeight) return;
    const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d;
    S = Math.min(innerHeight / 720, innerWidth / 900); VW = innerWidth / S; VH = innerHeight / S; OY = (VH - 720) / 2;
    g.setTransform(d * S, 0, 0, d * S, 0, d * S * OY);
  }
  addEventListener('resize', resize); resize();

  function drawSky() {
    const gr = g.createLinearGradient(0, -OY, 0, 470); gr.addColorStop(0, '#8fbfe0'); gr.addColorStop(0.75, '#d8e6ea'); gr.addColorStop(1, '#f2e2c4');
    g.fillStyle = gr; g.fillRect(0, -OY, VW, 470 + OY);
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 7; i++) { const x = ((i * 380 - cam * 0.05) % (VW + 400) + VW + 400) % (VW + 400) - 200, y = 60 + hash(i) * 110;
      g.beginPath(); g.ellipse(x, y, 70, 18, 0, 0, 7); g.ellipse(x + 40, y - 10, 46, 20, 0, 0, 7); g.ellipse(x - 40, y - 4, 40, 14, 0, 0, 7); g.fill(); }
    // toits lointains
    g.fillStyle = '#b7c3cc';
    g.beginPath(); g.moveTo(0, 470);
    for (let x = -40; x <= VW + 40; x += 20) { const wx = x + cam * 0.3, k = Math.floor(wx / 90); g.lineTo(x, 300 + hash(k) * 70 + (hash(k + 0.5) < 0.12 ? -50 : 0)); }
    g.lineTo(VW, 470); g.fill();
  }
  function drawBuilding(b) {
    const x = b.x - cam * 0.92 + BX, base = 470, top = base - b.h;
    if (x > VW + 20 || x + b.w < -20) return;
    const col = BCOL[b.k % BCOL.length];
    g.fillStyle = col; g.fillRect(x, top, b.w, b.h);
    // toit en zinc + lucarnes
    g.fillStyle = '#6f7f8c'; g.beginPath(); g.moveTo(x - 4, top); g.lineTo(x + 14, top - 42); g.lineTo(x + b.w - 14, top - 42); g.lineTo(x + b.w + 4, top); g.fill();
    g.fillStyle = '#8a4a3a'; g.fillRect(x + b.w * 0.7, top - 64, 14, 26); g.fillRect(x + b.w * 0.25, top - 58, 10, 20);
    const cols = Math.max(2, Math.floor(b.w / 58)), cw = b.w / cols;
    for (let c = 0; c < cols; c++) { const dx = x + c * cw + cw / 2 - 9; g.fillStyle = '#5b6a76'; g.fillRect(dx, top - 34, 18, 22); g.fillStyle = '#c6d4dc'; g.fillRect(dx + 3, top - 30, 12, 15); }
    // étages
    const floors = Math.floor((b.h - 80) / 62);
    for (let f = 0; f < floors; f++) {
      const wy = top + 22 + f * 62;
      for (let c = 0; c < cols; c++) {
        const wx = x + c * cw + cw / 2 - 12, lit = hash(b.k * 13 + f * 7 + c) < 0.18;
        g.fillStyle = lit ? '#f3d68a' : '#4b5a66'; g.fillRect(wx, wy, 24, 38);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(wx + 2, wy + 2, 9, 34);
        g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(wx + 12, wy); g.lineTo(wx + 12, wy + 38); g.moveTo(wx, wy + 18); g.lineTo(wx + 24, wy + 18); g.stroke();
        if (f === 1 || hash(b.k + f) < 0.25) { g.strokeStyle = '#2b2b2b'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i <= 6; i++) { g.moveTo(wx - 4 + i * 5.3, wy + 30); g.lineTo(wx - 4 + i * 5.3, wy + 42); } g.moveTo(wx - 5, wy + 30); g.lineTo(wx + 29, wy + 30); g.stroke(); }
      }
      g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(x, wy + 50, b.w, 3);
    }
    // rez-de-chaussée : boutique
    const [name, sc] = SHOPS[b.k % SHOPS.length];
    g.fillStyle = sc; g.fillRect(x + 6, base - 78, b.w - 12, 78);
    g.fillStyle = '#d7e3e8'; g.fillRect(x + 16, base - 52, b.w * 0.55, 46);
    g.fillStyle = '#2a2420'; g.fillRect(x + b.w - 44, base - 60, 26, 60);
    g.fillStyle = '#f4ead2'; g.font = '700 13px "DM Sans", sans-serif'; g.textAlign = 'center'; g.fillText(name, x + b.w / 2, base - 62);
    // store rayé
    for (let i = 0; i < Math.floor((b.w * 0.55 + 10) / 14); i++) { g.fillStyle = i % 2 ? '#f4ead2' : sc; g.beginPath(); g.moveTo(x + 12 + i * 14, base - 56); g.lineTo(x + 26 + i * 14, base - 56); g.lineTo(x + 30 + i * 14, base - 40); g.lineTo(x + 16 + i * 14, base - 40); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + b.w - 2, top, 2, b.h);
  }
  function drawStreet() {
    // trottoir, bordure, chaussée
    g.fillStyle = '#c9bfae'; g.fillRect(0, 470, VW, 40);
    g.fillStyle = 'rgba(0,0,0,.07)'; for (let x = -((cam) % 60); x < VW; x += 60) g.fillRect(x, 470, 2, 40);
    g.fillStyle = '#9d9284'; g.fillRect(0, 508, VW, 8);
    g.fillStyle = '#4a4744'; g.fillRect(0, 516, VW, 220 + OY);
    g.fillStyle = 'rgba(255,255,255,.8)'; for (let x = -((cam) % 160); x < VW; x += 160) g.fillRect(x, 676, 80, 6);
    // piste cyclable
    g.fillStyle = '#5d6a4f'; g.fillRect(0, 548, VW, 92); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(0, 548, VW, 3); g.fillRect(0, 637, VW, 3);
    for (let x = -((cam + 300) % 900); x < VW; x += 900) { g.save(); g.translate(x, 615); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(-22, 0, 12, 0, 7); g.arc(22, 0, 12, 0, 7); g.moveTo(-22, 0); g.lineTo(-6, -16); g.lineTo(14, -16); g.lineTo(22, 0); g.stroke(); g.restore(); }
  }
  function drawProp(p) {
    const x = p.x - cam + BX; if (x < -80 || x > VW + 80) return;
    if (p.type === 'lamp') {
      g.fillStyle = '#2b3530'; g.fillRect(x - 3, 300, 6, 200); g.fillRect(x - 8, 494, 16, 10);
      g.beginPath(); g.moveTo(x - 14, 300); g.lineTo(x + 14, 300); g.lineTo(x + 9, 274); g.lineTo(x - 9, 274); g.fill(); g.fillStyle = '#f6e7b0'; g.fillRect(x - 8, 282, 16, 14);
    } else {
      g.fillStyle = '#6b5a45'; g.fillRect(x - 6, 360, 12, 140); g.fillStyle = '#3a2f24'; g.fillRect(x - 22, 496, 44, 6);
      const k = Math.floor(p.x);
      for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#5f7d45' : '#6f8f50'; g.beginPath(); g.arc(x + (hash(k + i) - 0.5) * 80, 300 + (hash(k + i * 3) - 0.5) * 70, 36 + hash(k * 2 + i) * 18, 0, 7); g.fill(); }
    }
  }
  function drawObstacle(o) {
    const x = o.x - cam + BX; if (x < -1000 || x > VW + 60) return;
    g.save(); g.translate(x, 0);
    if (o.type === 'nid') { g.fillStyle = '#2a2826'; g.beginPath(); g.ellipse(0, 612, 30, 9, 0, 0, 7); g.fill(); g.fillStyle = '#3a3734'; g.beginPath(); g.ellipse(4, 608, 18, 4, 0, 0, 7); g.fill(); g.fillStyle = '#6a665f'; for (let i = 0; i < 4; i++) g.fillRect(-36 + i * 22, 600 + (i % 2) * 18, 5, 3); }
    if (o.type === 'dos') { g.fillStyle = '#d8d2c4'; g.beginPath(); g.moveTo(-42, 616); g.quadraticCurveTo(0, 590, 42, 616); g.fill(); g.fillStyle = '#e0b020'; for (let i = -2; i <= 2; i++) { g.save(); g.translate(i * 14, 604); g.rotate(-0.4); g.fillRect(-4, -3, 8, 6); g.restore(); } g.fillStyle = '#2b2b2b'; g.font = '700 11px DM Sans'; g.textAlign = 'center'; }
    if (o.type === 'rails') { g.fillStyle = '#8b8b88'; g.fillRect(-14, 548, 5, 92); g.fillRect(14, 548, 5, 92); g.fillStyle = '#2a2826'; g.fillRect(-9, 548, 2, 92); g.fillRect(19, 548, 2, 92); }
    if (o.type === 'plaque') { g.fillStyle = '#3a3836'; g.beginPath(); g.ellipse(0, 610, 30, 9, 0, 0, 7); g.fill(); g.strokeStyle = '#5a5752'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 610, 22, 6, 0, 0, 7); g.moveTo(-18, 610); g.lineTo(18, 610); g.stroke(); }
    if (o.type === 'bordure') { g.fillStyle = '#9d9284'; g.fillRect(-6, 548, 50, 92); g.fillStyle = '#b4aa9a'; g.fillRect(-6, 548, 8, 92); g.fillStyle = '#d0453a'; g.fillRect(4, 560, 30, 6); g.fillStyle = '#fff'; g.font = '700 10px DM Sans'; g.textAlign = 'center'; g.fillText('TRAVAUX', 19, 584); }
    if (o.type === 'paves') {
      g.save(); g.beginPath(); g.rect(0, 548, o.len, 92); g.clip(); g.fillStyle = '#6d6862'; g.fillRect(0, 548, o.len, 92);
      for (let r = 0; r < 8; r++) for (let c = 0; c < o.len / 16 + 1; c++) { const off = r % 2 ? 8 : 0; g.fillStyle = hash(r * 31 + c) < 0.5 ? '#827c74' : '#77716a'; g.beginPath(); g.ellipse(c * 16 + off, 553 + r * 12, 7, 5, 0, 0, 7); g.fill(); }
      g.restore(); g.fillStyle = '#2b2118'; g.font = '700 11px DM Sans'; g.textAlign = 'left'; g.fillText('PAVÉS', 6, 545);
    }
    g.restore();
  }
  function drawPigeon(p) {
    const x = p.x - cam + BX; if (x < -40 || x > VW + 40 || p.y < -OY - 40) return;
    g.save(); g.translate(x, p.y); g.fillStyle = '#7b8088';
    g.beginPath(); g.ellipse(0, -6, 9, 6, 0, 0, 7); g.fill(); g.beginPath(); g.arc(8, -12, 4, 0, 7); g.fill(); g.fillStyle = '#e09030'; g.fillRect(11, -12, 4, 2);
    if (p.fly) { const w = Math.sin(t * 30 + p.ph) * 10; g.fillStyle = '#6a6f77'; g.beginPath(); g.moveTo(-4, -8); g.lineTo(-14, -8 - w); g.lineTo(4, -8); g.fill(); }
    else { g.strokeStyle = '#c0605a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-1, 0); g.lineTo(-1, 4); g.moveTo(2, 0); g.lineTo(2, 4); g.stroke(); }
    g.restore();
  }

  /* ------------------------------------------------------------------ dessin : vélo cargo */
  function wheel(x, y, r, a) {
    g.strokeStyle = '#1d1a17'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    g.strokeStyle = '#9a958d'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 12; i++) { const q = a + i * Math.PI / 6; g.moveTo(x, y); g.lineTo(x + Math.cos(q) * (r - 3), y + Math.sin(q) * (r - 3)); } g.stroke();
    g.fillStyle = '#3a3632'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
  }
  function limb(ax, ay, bx, by, l1, l2, bend) {
    const dx = bx - ax, dy = by - ay, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01), a = Math.atan2(dy, dx);
    const k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * bend;
    return [ax + Math.cos(a - k) * l1, ay + Math.sin(a - k) * l1];
  }
  function drawBike() {
    const y0 = bikeJ, rot = cam / 34;
    const rx = BX, ry = GROUND - 34 + y0, fx = BX + 210, fy = GROUND - 26 + y0, bb = [BX + 42, GROUND - 32 + y0];
    // ombre
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(BX + 105, GROUND + 2, 150, 8, 0, 0, 7); g.fill();
    wheel(rx, ry, 34, rot); wheel(fx, fy, 26, rot * 1.3);
    // cadre
    g.strokeStyle = '#1f6f78'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    const seat = [BX + 22, ry - 92], head = [BX + 74, ry - 84];
    g.beginPath(); g.moveTo(rx, ry); g.lineTo(...bb); g.lineTo(...seat); g.lineTo(rx, ry); g.moveTo(...bb); g.lineTo(BX + 80, ry - 4); g.lineTo(BX + 188, ry - 4); g.lineTo(fx, fy); g.moveTo(...seat); g.lineTo(BX + 70, ry - 70); g.lineTo(...bb); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(BX + 70, ry - 70); g.lineTo(head[0] - 4, head[1]); g.stroke();
    g.strokeStyle = '#1d1a17'; g.lineWidth = 5; g.beginPath(); g.moveTo(head[0] - 14, head[1] - 2); g.lineTo(head[0] + 8, head[1] - 6); g.stroke();
    g.fillStyle = '#1d1a17'; g.beginPath(); g.ellipse(seat[0] - 2, seat[1] - 4, 16, 5, -0.05, 0, 7); g.fill();
    // plateau + colis
    g.fillStyle = '#2a2622'; g.fillRect(BX + 82, ry - 10, 108, 6);
    g.save(); g.translate(BX + 136, ry - 10 + Math.min(0, box.y * 0.15) + box.y * 0.15); g.rotate(box.r);
    const bh = 84 - Math.max(0, -box.y * 0.04);
    g.fillStyle = '#c99a5c'; g.fillRect(-50, -bh, 100, bh); g.fillStyle = '#b38449'; g.fillRect(-50, -bh, 100, 8);
    g.fillStyle = 'rgba(220, 190, 130, .85)'; g.fillRect(-9, -bh, 18, bh);
    g.save(); g.translate(0, -bh / 2 + 4); g.rotate(-0.12); g.strokeStyle = '#c8281f'; g.lineWidth = 2.5; g.strokeRect(-40, -12, 80, 24); g.fillStyle = '#c8281f'; g.font = '400 17px "Permanent Marker", cursive'; g.textAlign = 'center'; g.fillText('FRAGILE', 0, 6); g.restore();
    g.strokeStyle = '#2b2118'; g.lineWidth = 2; g.beginPath(); g.moveTo(-36, -18); g.lineTo(-36, -30); g.moveTo(-41, -26); g.lineTo(-36, -31); g.lineTo(-31, -26); g.moveTo(36, -18); g.lineTo(36, -30); g.moveTo(31, -26); g.lineTo(36, -31); g.lineTo(41, -26); g.stroke();
    g.restore();
    // cycliste
    const hip = [seat[0] + 2, seat[1] - 8], sh = [BX + 52, ry - 160], hd = [BX + 64, ry - 186];
    const ped = a => [bb[0] + Math.cos(a) * 17, bb[1] + Math.sin(a) * 17];
    const leg = (a, col) => { const p = ped(a), k = limb(hip[0], hip[1], p[0], p[1], 50, 48, -1); g.strokeStyle = col; g.lineWidth = 11; g.beginPath(); g.moveTo(...hip); g.lineTo(...k); g.lineTo(...p); g.stroke(); g.fillStyle = '#1d1a17'; g.fillRect(p[0] - 7, p[1] - 3, 14, 6); };
    leg(crank + Math.PI, '#2b3a55');
    g.strokeStyle = '#3a3632'; g.lineWidth = 3; g.beginPath(); g.moveTo(...ped(crank)); g.lineTo(...ped(crank + Math.PI)); g.stroke();
    g.fillStyle = '#3a3632'; g.beginPath(); g.arc(...bb, 9, 0, 7); g.fill();
    g.strokeStyle = '#d0532f'; g.lineWidth = 20; g.beginPath(); g.moveTo(...hip); g.lineTo(...sh); g.stroke();
    g.fillStyle = '#f2c94c'; g.fillRect(sh[0] - 14, sh[1] + 8, 4, 40);
    leg(crank, '#34466a');
    const hand = [head[0] - 10, head[1] - 4], el = limb(sh[0], sh[1], hand[0], hand[1], 34, 32, 1);
    g.strokeStyle = '#d0532f'; g.lineWidth = 9; g.beginPath(); g.moveTo(...sh); g.lineTo(...el); g.lineTo(...hand); g.stroke();
    g.fillStyle = '#e8b58e'; g.beginPath(); g.arc(...hand, 5, 0, 7); g.fill();
    g.beginPath(); g.arc(hd[0], hd[1], 15, 0, 7); g.fill();
    g.fillStyle = '#2f9e8f'; g.beginPath(); g.arc(hd[0] - 1, hd[1] - 4, 17, Math.PI * 1.02, Math.PI * 2.05); g.fill(); g.fillRect(hd[0] + 10, hd[1] - 6, 9, 3);
    g.fillStyle = '#2b2118'; g.beginPath(); g.arc(hd[0] + 9, hd[1] + 1, 2, 0, 7); g.fill();
  }

  /* ------------------------------------------------------------------ dessin : objets (pour le déballage) */
  const INK = '#2b2118', PORC = '#fbf8f2', BLUE = '#2c5aa0';
  const SHAPES = {
    cup() { g.fillStyle = PORC; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-24, -16); g.lineTo(24, -16); g.quadraticCurveTo(22, 18, 0, 20); g.quadraticCurveTo(-22, 18, -24, -16); g.fill(); g.stroke(); g.beginPath(); g.arc(27, -2, 9, -1.4, 1.6); g.stroke(); g.strokeStyle = BLUE; g.lineWidth = 3; g.beginPath(); g.moveTo(-22, -9); g.lineTo(22, -9); g.stroke(); dots(0, 4, 3); },
    saucer() { g.fillStyle = PORC; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 36, 12, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = BLUE; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 30, 9, 0, 0, 7); g.stroke(); g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, 14, 4, 0, 0, 7); g.stroke(); },
    teapot() { g.fillStyle = PORC; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(28, 0); g.quadraticCurveTo(46, -2, 56, -22); g.lineTo(60, -18); g.quadraticCurveTo(50, 10, 30, 12); g.fill(); g.stroke(); g.beginPath(); g.arc(-34, 0, 13, 1.7, 4.6); g.stroke(); g.beginPath(); g.ellipse(0, 4, 36, 26, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -21, 18, 6, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -28, 5, 0, 7); g.fill(); g.stroke(); dots(0, 6, 6); },
    sugar() { g.fillStyle = PORC; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(-27, 0, 7, 1.6, 4.7); g.stroke(); g.beginPath(); g.arc(27, 0, 7, -1.5, 1.5); g.stroke(); g.beginPath(); g.moveTo(-24, -12); g.lineTo(24, -12); g.quadraticCurveTo(24, 20, 0, 20); g.quadraticCurveTo(-24, 20, -24, -12); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -14, 26, 6, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -21, 4, 0, 7); g.fill(); g.stroke(); dots(0, 4, 4); },
    jug() { g.fillStyle = PORC; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-16, -22); g.lineTo(20, -22); g.lineTo(28, -28); g.lineTo(22, -16); g.quadraticCurveTo(24, 22, 0, 22); g.quadraticCurveTo(-22, 22, -18, -16); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(-20, 0, 10, 1.7, 4.6); g.stroke(); dots(2, 4, 3); },
    egg() { g.fillStyle = '#efd9b4'; g.strokeStyle = '#8a6a44'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 0, 17, 22, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(140, 100, 60, .35)'; for (let i = 0; i < 6; i++) g.fillRect(-9 + hash(i) * 18, -12 + hash(i + 9) * 24, 2, 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-6, -8, 4, 7, -0.3, 0, 7); g.fill(); },
    flute() { g.fillStyle = 'rgba(220, 235, 245, .45)'; g.strokeStyle = '#6f8494'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-9, -42); g.lineTo(9, -42); g.quadraticCurveTo(10, -6, 1.5, 2); g.lineTo(1.5, 30); g.lineTo(-1.5, 30); g.lineTo(-1.5, 2); g.quadraticCurveTo(-10, -6, -9, -42); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, 32, 14, 4, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(-5, -36); g.lineTo(-4, -10); g.stroke(); },
    carafe() { g.fillStyle = 'rgba(220, 235, 245, .45)'; g.strokeStyle = '#6f8494'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-8, -44); g.lineTo(8, -44); g.lineTo(8, -20); g.quadraticCurveTo(30, -6, 26, 18); g.quadraticCurveTo(22, 34, 0, 34); g.quadraticCurveTo(-22, 34, -26, 18); g.quadraticCurveTo(-30, -6, -8, -20); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(-14, -2); g.quadraticCurveTo(-20, 12, -12, 24); g.stroke(); for (let i = -2; i <= 2; i++) { g.strokeStyle = 'rgba(111,132,148,.5)'; g.beginPath(); g.moveTo(i * 8, 8); g.lineTo(i * 8 + 4, 26); g.stroke(); } },
    castle() { g.fillStyle = '#9a9aa6'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, 22); g.lineTo(-26, -14); for (let i = 0; i < 4; i++) { g.lineTo(-26 + i * 13, -22); g.lineTo(-20 + i * 13, -22); g.lineTo(-20 + i * 13, -14); g.lineTo(-13 + i * 13, -14); } g.lineTo(26, -14); g.lineTo(26, 22); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a3640'; g.beginPath(); g.arc(0, 22, 9, Math.PI, 0); g.fill(); g.fillRect(-14, -6, 5, 8); g.fillRect(9, -6, 5, 8); },
    tank(it) {
      const level = it.hp <= 0 ? 0 : it.hp < 1 ? 0.62 : 0.88;
      g.fillStyle = 'rgba(210, 230, 240, .25)'; g.fillRect(-86, -58, 172, 116);
      if (level) { g.fillStyle = 'rgba(80, 160, 205, .55)'; g.fillRect(-86, 58 - 116 * level, 172, 116 * level); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-86, 58 - 116 * level); g.lineTo(86, 58 - 116 * level); g.stroke(); }
      g.fillStyle = '#b89a6a'; g.fillRect(-86, 44, 172, 14); g.fillStyle = '#4f8a3a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-64 + i * 9, 46); g.quadraticCurveTo(-74 + i * 12, 4, -60 + i * 9, -24 + i * 8); g.quadraticCurveTo(-60 + i * 12, 8, -56 + i * 9, 46); g.fill(); }
      if (level) fish(Math.sin(performance.now() / 700) * 30, -4 + Math.sin(performance.now() / 400) * 4, Math.cos(performance.now() / 700) > 0 ? 1 : -1, false);
      g.strokeStyle = '#4d5f6a'; g.lineWidth = 3; g.strokeRect(-86, -58, 172, 116); g.fillStyle = '#2b2b2b'; g.fillRect(-90, -64, 180, 7);
    },
  };
  function dots(cx, cy, n) { g.fillStyle = BLUE; for (let i = 0; i < n; i++) { g.beginPath(); g.arc(cx - (n - 1) * 5 + i * 10, cy + (i % 2) * 4, 2.2, 0, 7); g.fill(); } }
  function fish(x, y, dir, gasp) {
    g.save(); g.translate(x, y); g.scale(dir, 1); if (gasp) g.rotate(Math.PI / 2 + Math.sin(performance.now() / 120) * 0.25);
    g.fillStyle = '#f08a24'; g.beginPath(); g.ellipse(0, 0, 16, 10, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(-12, 0); g.lineTo(-26, -9); g.lineTo(-24, 0); g.lineTo(-26, 9); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(8, -3, 3.5, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(9, -3, 1.8, 0, 7); g.fill(); g.restore();
  }
  function drawItem(it) {
    const shape = () => SHAPES[it.kind](it);
    if (it.kind === 'tank') {
      if (it.hp <= 0) { g.fillStyle = 'rgba(80,160,205,.35)'; g.beginPath(); g.ellipse(0, 50, 120, 22, 0, 0, 7); g.fill(); shards(() => { g.strokeStyle = '#4d5f6a'; g.lineWidth = 3; g.fillStyle = 'rgba(210,230,240,.3)'; g.fillRect(-86, -58, 172, 116); g.strokeRect(-86, -58, 172, 116); }, it.seed, 6, 30); fish(0, 44, 1, true); return; }
      shape(); if (it.hp < 1) cracks(it.seed, 70); return;
    }
    if (it.hp >= 1) return shape();
    if (it.hp > 0) { shape(); cracks(it.seed, 24); return; }
    if (it.kind === 'egg') { g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(0, 6, 30, 16, 0.2, 0, 7); g.fill(); g.fillStyle = '#f2b51e'; g.beginPath(); g.arc(4, 6, 10, 0, 7); g.fill(); shards(shape, it.seed, 3, 18); return; }
    shards(shape, it.seed, 4, 14);
  }
  function shards(draw, seed, n, spread) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + hash(seed + i) * 0.6, a1 = ((i + 1) / n) * Math.PI * 2 + hash(seed + i + 1) * 0.6, am = (a0 + a1) / 2;
      g.save(); g.translate(Math.cos(am) * spread * (0.6 + hash(seed * 2 + i)), Math.sin(am) * spread * 0.6 * (0.6 + hash(seed * 3 + i))); g.rotate((hash(seed + i * 7) - 0.5) * 0.9);
      g.beginPath(); g.moveTo(0, 0); for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * k / 4; g.lineTo(Math.cos(a) * 110, Math.sin(a) * 110); } g.closePath(); g.clip(); draw(); g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 8; i++) { g.save(); g.translate((hash(seed + i * 5) - 0.5) * spread * 4, 18 + hash(seed + i * 11) * 10); g.rotate(i); g.fillRect(-2, -1.5, 4, 3); g.restore(); }
  }
  function cracks(seed, r) {
    g.strokeStyle = 'rgba(43, 33, 24, .85)'; g.lineWidth = 1.3; g.beginPath();
    let x = (hash(seed) - 0.5) * r * 0.6, y = -r * 0.5; g.moveTo(x, y);
    for (let i = 0; i < 6; i++) { x += (hash(seed + i * 3) - 0.5) * r * 0.5; y += r * 0.2; g.lineTo(x, y); if (i === 2) { g.moveTo(x, y); g.lineTo(x + r * 0.3, y + r * 0.15); g.moveTo(x, y); } }
    g.stroke();
  }

  /* ------------------------------------------------------------------ dessin : déballage */
  function drawUnboxing() {
    const k = clamp(revealT / 0.8, 0, 1);
    g.fillStyle = '#6b4a30'; g.fillRect(0, -OY, VW, VH);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = -OY; y < VH; y += 46) g.fillRect(0, y, VW, 2);
    // mise en page
    const cells = items.reduce((s, i) => s + i.big * i.big, 0), cols = items[0].big > 1 ? 3 : Math.ceil(Math.sqrt(cells * 1.7)), rows = Math.ceil(cells / cols);
    const cw = 118, chh = 104, bw = cols * cw + 60, bh = (items[0].big > 1 ? 2 : rows) * chh + 50, cx = VW / 2;
    const U = Math.min(1.5, (VW - 60) / (bw + 170), 450 / (bh + 170)), cy = 40 + (bh / 2 + 85) * U;
    // carton ouvert, rabats
    g.save(); g.translate(cx, cy); g.scale(U, U);
    g.fillStyle = '#b38449';
    const flap = 34 + 50 * k;
    g.beginPath(); g.moveTo(-bw / 2, -bh / 2); g.lineTo(-bw / 2 + 20, -bh / 2 - flap); g.lineTo(bw / 2 - 20, -bh / 2 - flap); g.lineTo(bw / 2, -bh / 2); g.fill();
    g.beginPath(); g.moveTo(-bw / 2, bh / 2); g.lineTo(-bw / 2 + 20, bh / 2 + flap); g.lineTo(bw / 2 - 20, bh / 2 + flap); g.lineTo(bw / 2, bh / 2); g.fill();
    g.fillStyle = '#c99a5c';
    g.beginPath(); g.moveTo(-bw / 2, -bh / 2); g.lineTo(-bw / 2 - flap, -bh / 2 + 20); g.lineTo(-bw / 2 - flap, bh / 2 - 20); g.lineTo(-bw / 2, bh / 2); g.fill();
    g.beginPath(); g.moveTo(bw / 2, -bh / 2); g.lineTo(bw / 2 + flap, -bh / 2 + 20); g.lineTo(bw / 2 + flap, bh / 2 - 20); g.lineTo(bw / 2, bh / 2); g.fill();
    g.fillStyle = '#5a3f22'; g.fillRect(-bw / 2, -bh / 2, bw, bh);
    g.strokeStyle = 'rgba(222, 190, 120, .55)'; g.lineWidth = 2;
    for (let i = 0; i < 160; i++) { const x = (hash(i) - 0.5) * bw, y = (hash(i + 0.3) - 0.5) * bh, a = hash(i + 0.7) * 6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12 - 6, x + Math.cos(a) * 24, y + Math.sin(a) * 24); g.stroke(); }
    g.fillStyle = 'rgba(214, 180, 120, .9)'; g.fillRect(-bw / 2 - flap, -11, 16, 22); g.fillRect(bw / 2 + flap - 16, -11, 16, 22);
    // objets, révélés un à un
    let col = 0, row = 0;
    items.forEach((it, i) => {
      let x, y;
      if (it.big > 1) { x = -bw / 2 + 30 + cw; y = 0; }
      else if (items[0].big > 1) { x = -bw / 2 + 30 + cw * 2.5; y = -chh / 2 + (i - 1) * chh; }
      else { x = -bw / 2 + 30 + cw * (col + 0.5); y = -bh / 2 + 25 + chh * (row + 0.5); if (++col >= cols) { col = 0; row++; } }
      const appear = clamp((revealT - 0.9 - i * 0.28) / 0.3, 0, 1); if (!appear) return;
      if (appear < 1 || it.revealed) {} else { it.revealed = true; if (it.hp <= 0) tone(rand(1800, 2600), 0.25, 0.04, 'sine', 0.8); }
      g.save(); g.translate(x, y + (1 - appear) * -20); g.globalAlpha = appear; g.scale(it.big > 1 ? 1.2 : 0.95, it.big > 1 ? 1.2 : 0.95); drawItem(it); g.restore();
    });
    g.restore();
    g.fillStyle = '#f4e7cf'; g.font = '800 15px "DM Sans", sans-serif'; g.textAlign = 'center'; g.globalAlpha = k;
    g.fillText(pkg.opener.toUpperCase(), VW / 2, Math.max(24 - OY, cy - (bh / 2 + flap) * U - 14)); g.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ HUD */
  function drawHUD() {
    const w = Math.min(520, VW - 360), x = (VW - w) / 2, y = 26 - Math.min(0, OY) ;
    g.fillStyle = 'rgba(43,33,24,.75)'; roundRect(x - 14, y - 14, w + 28, 46, 23); g.fill();
    g.fillStyle = 'rgba(244,231,207,.3)'; g.fillRect(x, y + 8, w, 4); g.fillStyle = '#f2c94c'; g.fillRect(x, y + 8, w * clamp(cam / L, 0, 1), 4);
    g.font = '15px system-ui'; g.textAlign = 'center'; g.fillText('🚲', x + w * clamp(cam / L, 0, 1), y + 6); g.fillText('🏠', x + w + 2, y + 6);
    const late = t > TARGET; g.fillStyle = late ? '#ff7a6a' : '#f4e7cf'; g.font = '800 13px "DM Sans", sans-serif'; g.textAlign = 'left';
    g.fillText(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, x, y + 27);
    g.textAlign = 'right'; g.fillStyle = '#f4e7cf'; g.fillText(`${Math.round(v / VMAX * 32)} km/h`, x + w, y + 27);
    g.textAlign = 'center'; g.globalAlpha = 0.75; g.fillText(late ? 'en retard !' : `promis en ${Math.floor(TARGET / 60)}:${String(TARGET % 60).padStart(2, '0')}`, x + w / 2, y + 27); g.globalAlpha = 1;
    // pédales tactiles
    const a = t < 8 ? 0.9 : 0.35, by = 700 + Math.min(OY, 40);
    g.globalAlpha = a; g.fillStyle = brake ? '#c8281f' : 'rgba(43,33,24,.7)'; roundRect(18, by - 50, 130, 40, 20); g.fill();
    g.fillStyle = pedal ? '#2f9e8f' : 'rgba(43,33,24,.7)'; roundRect(VW - 148, by - 50, 130, 40, 20); g.fill();
    g.fillStyle = '#f4e7cf'; g.font = '800 13px "DM Sans", sans-serif'; g.textAlign = 'center'; g.fillText('◀  FREINER', 83, by - 25); g.fillText('PÉDALER  ▶', VW - 83, by - 25); g.globalAlpha = 1;
    for (const c of captions) { const k = c.life / 1.4; g.globalAlpha = 1 - k * k; g.fillStyle = c.big ? '#c8281f' : '#2b2118'; g.font = `400 ${c.big ? 30 : 22}px "Permanent Marker", cursive`; g.textAlign = 'center'; g.save(); g.translate(c.x, c.y - k * 60); g.rotate(-0.12); g.lineWidth = 5; g.strokeStyle = '#fff6e4'; g.strokeText(c.text, 0, 0); g.fillText(c.text, 0, 0); g.restore(); }
    g.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function drawDoor() {
    const x = L + 330 - cam + BX; if (x > VW + 200) return;
    g.fillStyle = '#e8dcc4'; g.fillRect(x - 10, 200, 240, 270); g.fillStyle = '#2a4a3a'; g.fillRect(x + 60, 330, 80, 140); g.fillStyle = '#c9a046'; g.beginPath(); g.arc(x + 128, 400, 4, 0, 7); g.fill();
    g.fillStyle = '#2b2118'; g.font = '800 18px DM Sans'; g.textAlign = 'center'; g.fillText('N° ' + (12 + pkgIndex * 4), x + 100, 318);
    g.fillStyle = '#c8281f'; g.fillRect(x + 150, 400, 26, 18); g.fillStyle = '#fff'; g.font = '700 8px DM Sans'; g.fillText('ICI', x + 163, 412);
  }

  /* ------------------------------------------------------------------ boucle */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.04, (now - last) / 1000); last = now; step(dt); render();
  }
  function render() {
    const d = Math.min(2, devicePixelRatio || 1); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#1d1a17'; g.fillRect(0, 0, cv.width, cv.height); g.setTransform(d * S, 0, 0, d * S, 0, d * S * OY);
    if (state === 'open') { drawUnboxing(); return; }
    drawSky(); for (const b of buildings) drawBuilding(b); drawDoor(); drawStreet();
    for (const p of props) drawProp(p);
    for (const o of course) drawObstacle(o);
    for (const p of pigeons) if (!p.fly) drawPigeon(p);
    drawBike();
    for (const p of pigeons) if (p.fly) drawPigeon(p);
    if (state === 'ride') drawHUD();
  }
  showIntro(); requestAnimationFrame(frame);
  window.fragile = { get state() { return state; }, items: () => items, course: () => course, advance(sec, p = true, b = false) { pedal = p; brake = b; for (let s = 0; s < sec; s += 1 / 60) step(1 / 60); render(); return { cam, v, t, state, broken: items.filter(i => i.hp <= 0).length }; }, newRun, set cam(x) { cam = x; } };
})();
