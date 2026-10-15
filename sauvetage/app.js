/*
 * Rebonds de secours — l'immeuble brûle, les habitants sautent, la toile des pompiers les fait rebondir
 * jusqu'à l'ambulance. Hommage aux vieux jeux électroniques de poche, en plus joli.
 */
(() => {
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  const W = 1280, H = 720, GROUND = 648, NET_Y = 596, AMB = { x: 1085, w: 175 };
  let scale = 1, ox = 0, oy = 0;
  function fit() {
    const d = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * d; cv.height = innerHeight * d;
    scale = Math.min(innerWidth / W, innerHeight / H); ox = (innerWidth - W * scale) / 2; oy = (innerHeight - H * scale) / 2;
    g.setTransform(d * scale, 0, 0, d * scale, d * ox, d * oy);
  }
  addEventListener('resize', fit); fit();
  const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];

  /* ------------------------------------------------------------------ son */
  let ac = null, muted = false, master;
  const audio = () => { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination); } return ac; };
  function tone(f, d, v = 0.1, type = 'sine', slide = 1, at = 0) {
    if (!ac || muted) return; const t = ac.currentTime + at, o = ac.createOscillator(), gg = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    gg.gain.setValueAtTime(v, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(gg); gg.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, f, v) {
    if (!ac || muted) return; const t = ac.currentTime, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gg = ac.createGain(); s.buffer = b; fl.type = 'lowpass'; fl.frequency.value = f; gg.gain.value = v; s.connect(fl); fl.connect(gg); gg.connect(master); s.start(t);
  }
  const SFX = {
    boing: (p = 1) => tone(180 * p, 0.28, 0.14, 'sine', 2.4),
    saved: () => { tone(784, 0.12, 0.08, 'square'); tone(1047, 0.25, 0.08, 'square', 1, 0.1); },
    miss: () => { noise(0.4, 600, 0.3); tone(110, 0.5, 0.12, 'sawtooth', 0.5); },
    piano: () => [196, 247, 294, 392].forEach((f, i) => tone(f, 0.9, 0.06, 'triangle', 1, i * 0.02)),
    siren: () => { for (let i = 0; i < 3; i++) { tone(700, 0.35, 0.03, 'triangle', 1, i * 0.7); tone(950, 0.35, 0.03, 'triangle', 1, i * 0.7 + 0.35); } },
  };
  document.getElementById('mute').addEventListener('click', e => { muted = !muted; e.target.textContent = muted ? 'muet' : 'son'; });

  /* ------------------------------------------------------------------ habitants qui sautent */
  const TYPES = [
    { id: 'chat', name: 'Chaton', r: 16, vx: 1.08, grav: 0.9, w: 5, pts: 1 },
    { id: 'mamie', name: 'Mamie', r: 23, vx: 1, grav: 1, w: 3, pts: 1 },
    { id: 'papy', name: 'Papy', r: 23, vx: 0.95, grav: 1, w: 3, pts: 1 },
    { id: 'chien', name: 'Chien', r: 20, vx: 1.05, grav: 1, w: 3, pts: 1 },
    { id: 'bocal', name: 'Poisson rouge', r: 18, vx: 1, grav: 0.95, w: 2, pts: 2 },
    { id: 'piano', name: 'Piano', r: 30, vx: 0.82, grav: 1.25, w: 1, pts: 3 },
  ];
  const weighted = () => { const tot = TYPES.reduce((a, t) => a + t.w, 0); let r = Math.random() * tot; for (const t of TYPES) { if ((r -= t.w) < 0) return t; } return TYPES[0]; };

  /* ------------------------------------------------------------------ état */
  let S = null;
  const best = () => +(localStorage.getItem('sauvetage.best') || 0);
  function reset() {
    S = { on: true, t: 0, score: 0, saved: 0, lives: 3, px: 640, target: 640, squash: 0, jumpers: [], nextSpawn: 1.2, pops: [], ghosts: [], smoke: [], embers: [], level: 0 };
  }
  const WINDOWS = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) WINDOWS.push({ x: 92 + c * 78, y: 118 + r * 78, burning: false });
  WINDOWS.forEach((w, i) => { w.burning = [1, 4, 6, 8, 11, 13].includes(i); });

  function spawn() {
    const type = weighted(), row = Math.floor(rand(0, 4)), wnd = WINDOWS[row * 3 + 2];
    const k = 1 + Math.min(0.45, S.t / 160);
    S.jumpers.push({ type, x: wnd.x + 50, y: wnd.y + 30, vx: rand(150, 190) * type.vx * k, vy: -rand(80, 160), rot: 0, vr: rand(-4, 4), bounces: 0 });
  }

  /* ------------------------------------------------------------------ contrôles */
  const toW = cx => (cx - ox) / scale;
  addEventListener('pointermove', e => { if (S) S.target = toW(e.clientX); });
  addEventListener('pointerdown', e => { if (S) S.target = toW(e.clientX); });
  const keys = {}; addEventListener('keydown', e => { keys[e.key] = true; }); addEventListener('keyup', e => { keys[e.key] = false; });

  /* ------------------------------------------------------------------ dessin */
  function sky(t) {
    const gr = g.createLinearGradient(0, 0, 0, GROUND);
    gr.addColorStop(0, '#1b1230'); gr.addColorStop(0.55, '#4a2340'); gr.addColorStop(1, '#c24a2a');
    g.fillStyle = gr; g.fillRect(0, 0, W, GROUND);
    g.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 40; i++) { const x = (i * 197) % W, y = (i * 53) % 260; g.globalAlpha = 0.3 + 0.3 * Math.sin(t * 2 + i); g.fillRect(x, y, 2, 2); } g.globalAlpha = 1;
    // ville au loin
    g.fillStyle = '#2a1830';
    for (let i = 0; i < 18; i++) { const x = 360 + i * 52, h = 90 + ((i * 37) % 120); g.fillRect(x, GROUND - h, 46, h); }
    g.fillStyle = 'rgba(255, 200, 120, .35)';
    for (let i = 0; i < 60; i++) { const x = 368 + ((i * 71) % 900), y = GROUND - 30 - ((i * 43) % 160); g.fillRect(x, y, 5, 7); }
    // lueur de l'incendie
    const glow = g.createRadialGradient(200, 300, 20, 200, 300, 520); glow.addColorStop(0, `rgba(255, 140, 40, ${0.35 + 0.05 * Math.sin(t * 7)})`); glow.addColorStop(1, 'rgba(255, 100, 30, 0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
  }
  function building(t) {
    g.fillStyle = '#5c2e26'; g.fillRect(60, 80, 270, GROUND - 80);
    g.fillStyle = '#4a241e'; for (let y = 86; y < GROUND; y += 14) for (let x = 60 + ((y / 14) % 2) * 14; x < 330; x += 28) g.fillRect(x, y, 26, 2);
    g.fillStyle = '#3a1a16'; g.fillRect(50, 70, 290, 16);
    for (const w of WINDOWS) {
      g.fillStyle = w.burning ? `rgb(255, ${150 + 50 * Math.sin(t * 9 + w.x)}, 60)` : '#2a1a22'; g.fillRect(w.x, w.y, 50, 56);
      g.strokeStyle = '#2a120e'; g.lineWidth = 4; g.strokeRect(w.x, w.y, 50, 56);
      if (w.burning) flames(w.x + 25, w.y + 10, t, 1);
    }
    // porte
    g.fillStyle = '#2a120e'; g.fillRect(170, GROUND - 90, 54, 90);
  }
  function flames(x, y, t, s) {
    for (let i = 0; i < 4; i++) {
      const h = (30 + 14 * Math.sin(t * 11 + i * 2 + x)) * s, w = (16 - i * 2) * s, dx = (i - 1.5) * 9 * s;
      const gr = g.createLinearGradient(0, y - h, 0, y + 10); gr.addColorStop(0, 'rgba(255, 230, 120, 0)'); gr.addColorStop(0.4, 'rgba(255, 170, 40, .9)'); gr.addColorStop(1, 'rgba(230, 60, 20, .95)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + dx - w, y + 10); g.quadraticCurveTo(x + dx - w * 0.6, y - h * 0.4, x + dx + Math.sin(t * 8 + i) * 5, y - h); g.quadraticCurveTo(x + dx + w * 0.6, y - h * 0.4, x + dx + w, y + 10); g.fill();
    }
  }
  function street() {
    g.fillStyle = '#3a3440'; g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#4a4450'; g.fillRect(0, GROUND, W, 10);
    g.fillStyle = 'rgba(255, 220, 120, .5)'; for (let x = 20; x < W; x += 80) g.fillRect(x, GROUND + 40, 40, 5);
    // borne à incendie
    g.fillStyle = '#c7302a'; g.fillRect(360, GROUND - 34, 18, 34); g.fillRect(354, GROUND - 38, 30, 8);
  }
  function ambulance(t) {
    const x = AMB.x, y = GROUND - 112;
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.roundRect(x, y, AMB.w, 92, 10); g.fill();
    g.fillStyle = '#d8322a'; g.fillRect(x, y + 50, AMB.w, 12);
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.roundRect(x + AMB.w - 10, y + 26, 40, 66, 8); g.fill();
    g.fillStyle = '#9fd0ef'; g.fillRect(x + AMB.w + 6, y + 34, 18, 22);
    // l'arrière ouvert, côté immeuble
    g.fillStyle = '#2b2530'; g.fillRect(x + 4, y + 8, 46, 78);
    g.fillStyle = '#f4f1ea'; g.save(); g.translate(x + 4, y + 8); g.transform(1, 0.12, 0, 1, 0, 0); g.fillRect(-26, 0, 26, 78); g.restore();
    g.fillStyle = '#d8322a'; g.fillRect(x + 92, y + 16, 10, 30); g.fillRect(x + 82, y + 26, 30, 10);
    g.fillStyle = '#2a2a30'; [x + 30, x + AMB.w].forEach(cx => { g.beginPath(); g.arc(cx, GROUND - 10, 16, 0, 7); g.fill(); g.fillStyle = '#888'; g.beginPath(); g.arc(cx, GROUND - 10, 6, 0, 7); g.fill(); g.fillStyle = '#2a2a30'; });
    // gyrophares
    const on = Math.sin(t * 12) > 0;
    g.fillStyle = on ? '#3a8cff' : '#18306a'; g.fillRect(x + 40, y - 10, 22, 10);
    g.fillStyle = !on ? '#ff3a3a' : '#6a1818'; g.fillRect(x + 110, y - 10, 22, 10);
    const gl = g.createRadialGradient(on ? x + 51 : x + 121, y - 5, 0, on ? x + 51 : x + 121, y - 5, 120); gl.addColorStop(0, on ? 'rgba(60, 140, 255, .35)' : 'rgba(255, 60, 60, .35)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl; g.fillRect(x - 80, y - 120, 300, 240);
    g.fillStyle = '#2a1622'; g.font = '900 13px Nunito'; g.fillText('SAMU 11', x + 66, y + 82);
  }
  function firefighters() {
    const x = S.px, sq = S.squash;
    // la toile, tenue par deux pompiers
    [x - 96, x + 96].forEach((fx, i) => {
      g.save(); g.translate(fx, GROUND);
      g.fillStyle = '#2a2a38'; g.fillRect(-12, -46, 9, 46); g.fillRect(3, -46, 9, 46);
      g.fillStyle = '#c7302a'; g.beginPath(); g.roundRect(-16, -96, 32, 54, 8); g.fill();
      g.fillStyle = '#ffd34a'; g.fillRect(-16, -70, 32, 6);
      g.fillStyle = '#f2c4a0'; g.beginPath(); g.arc(0, -108, 13, 0, 7); g.fill();
      g.fillStyle = '#ffd34a'; g.beginPath(); g.ellipse(0, -118, 18, 8, 0, Math.PI, 0); g.fill(); g.fillRect(-20, -118, 40, 4);
      g.strokeStyle = '#c7302a'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(i ? -10 : 10, -86); g.lineTo(i ? -30 : 30, NET_Y - GROUND + 6); g.stroke();
      g.restore();
    });
    g.fillStyle = '#ffd34a'; g.strokeStyle = '#2a1622'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(x, NET_Y + 6 + sq * 10, 80, 14 + sq * 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(42, 22, 34, .35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, NET_Y + 6 + sq * 10, 50, 8 + sq * 4, 0, 0, Math.PI * 2); g.stroke();
  }
  function drawJumper(j) {
    const r = j.type.r;
    g.save(); g.translate(j.x, j.y); g.rotate(j.rot);
    switch (j.type.id) {
      case 'chat':
        g.fillStyle = '#f0923a'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.beginPath(); g.moveTo(-12, -10); g.lineTo(-8, -24); g.lineTo(-2, -13); g.moveTo(12, -10); g.lineTo(8, -24); g.lineTo(2, -13); g.fill();
        g.strokeStyle = '#f0923a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(r - 2, 6); g.quadraticCurveTo(r + 14, 0, r + 8, -14); g.stroke();
        g.fillStyle = '#2a1622'; g.beginPath(); g.arc(-6, -2, 2.6, 0, 7); g.arc(6, -2, 2.6, 0, 7); g.fill();
        g.strokeStyle = '#2a1622'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-3, 5); g.lineTo(0, 7); g.lineTo(3, 5); g.stroke();
        break;
      case 'mamie': case 'papy': {
        const m = j.type.id === 'mamie';
        g.fillStyle = m ? '#8a4ab0' : '#3a5a8a'; g.beginPath(); g.roundRect(-r * 0.75, -4, r * 1.5, r * 1.3, 8); g.fill();
        g.fillStyle = '#f2c4a0'; g.beginPath(); g.arc(0, -16, 13, 0, 7); g.fill();
        if (m) { g.fillStyle = '#cfcfd8'; g.beginPath(); g.arc(0, -29, 8, 0, 7); g.arc(-10, -20, 5, 0, 7); g.arc(10, -20, 5, 0, 7); g.fill(); g.fillStyle = '#d8322a'; g.fillRect(r * 0.6, 10, 12, 10); }
        else { g.fillStyle = '#4a3a2a'; g.beginPath(); g.ellipse(0, -27, 15, 6, 0, 0, 7); g.fill(); g.fillStyle = '#eee'; g.fillRect(-9, -10, 18, 3); }
        g.fillStyle = '#2a1622'; g.beginPath(); g.arc(-5, -17, 2, 0, 7); g.arc(5, -17, 2, 0, 7); g.fill();
        g.beginPath(); g.arc(0, -10, 3.5, 0, Math.PI); g.fill();
        g.strokeStyle = '#f2c4a0'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-r * 0.7, 2); g.lineTo(-r * 1.2, -14); g.moveTo(r * 0.7, 2); g.lineTo(r * 1.2, -14); g.stroke();
        break;
      }
      case 'chien':
        g.fillStyle = '#b07a4a'; g.beginPath(); g.ellipse(0, 0, r + 6, r - 4, 0, 0, 7); g.fill();
        g.beginPath(); g.arc(r, -10, 11, 0, 7); g.fill();
        g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(r - 4, -16, 5, 9, 0.5, 0, 7); g.fill();
        g.fillStyle = '#2a1622'; g.beginPath(); g.arc(r + 5, -12, 2.4, 0, 7); g.arc(r + 11, -7, 3, 0, 7); g.fill();
        g.fillStyle = '#d8322a'; g.fillRect(r - 6, -4, 10, 4);
        break;
      case 'bocal':
        g.fillStyle = 'rgba(160, 220, 255, .55)'; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(-2, 2, 8, 5, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(5, 2); g.lineTo(12, -3); g.lineTo(12, 7); g.fill();
        g.fillStyle = '#2a1622'; g.beginPath(); g.arc(-6, 0, 1.4, 0, 7); g.fill();
        break;
      case 'piano':
        g.fillStyle = '#1a1418'; g.beginPath(); g.roundRect(-30, -24, 60, 46, 4); g.fill();
        g.fillStyle = '#fff'; g.fillRect(-26, -4, 52, 12); g.fillStyle = '#1a1418'; for (let k = -22; k < 26; k += 8) g.fillRect(k, -4, 4, 7);
        g.fillStyle = '#1a1418'; g.fillRect(-26, 22, 6, 10); g.fillRect(20, 22, 6, 10);
        break;
    }
    g.restore();
  }
  function hud() {
    g.fillStyle = 'rgba(20, 10, 18, .55)'; g.beginPath(); g.roundRect(W / 2 - 170, 14, 340, 54, 16); g.fill();
    g.fillStyle = '#fff'; g.font = '400 30px Bungee'; g.textAlign = 'center'; g.fillText(String(S.score), W / 2, 53);
    g.font = '800 11px Nunito'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('SAUVÉS', W / 2, 30);
    g.textAlign = 'left'; g.font = '22px sans-serif';
    for (let i = 0; i < 3; i++) { g.fillStyle = i < S.lives ? '#ff4a4a' : 'rgba(255,255,255,.2)'; g.fillText('♥', W / 2 - 150 + i * 30, 51); }
    g.textAlign = 'right'; g.font = '800 13px Nunito'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('Record ' + best(), W / 2 + 156, 51); g.textAlign = 'left';
  }

  /* ------------------------------------------------------------------ boucle */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    const t = now / 1000;
    g.clearRect(-ox / scale, -oy / scale, innerWidth / scale, innerHeight / scale);
    g.fillStyle = '#120c14'; g.fillRect(-ox / scale - 2, -oy / scale - 2, innerWidth / scale + 4, innerHeight / scale + 4);
    sky(t); building(t); street(); ambulance(t);
    // fumée et braises
    if (Math.random() < 0.5) (S?.smoke ?? smokeIdle).push({ x: rand(80, 320), y: rand(80, 300), r: rand(14, 30), vy: -rand(20, 45), vx: rand(5, 25), life: 0, max: rand(3, 6) });
    const smoke = S?.smoke ?? smokeIdle;
    for (let i = smoke.length - 1; i >= 0; i--) { const p = smoke[i]; p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 8 * dt; if (p.life > p.max) { smoke.splice(i, 1); continue; } g.fillStyle = `rgba(40, 30, 40, ${0.35 * (1 - p.life / p.max)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }

    if (S && S.on) {
      S.t += dt;
      if (keys.ArrowLeft) S.target -= 900 * dt; if (keys.ArrowRight) S.target += 900 * dt;
      S.target = Math.max(390, Math.min(1010, S.target));
      S.px += (S.target - S.px) * Math.min(1, dt * 16);
      S.squash = Math.max(0, S.squash - dt * 4);
      S.nextSpawn -= dt;
      const maxAir = 1 + Math.floor(S.t / 35);
      if (S.nextSpawn <= 0 && S.jumpers.length < maxAir) { spawn(); S.nextSpawn = Math.max(1.3, 3.2 - S.t / 45) * rand(0.8, 1.25); }
      for (let i = S.jumpers.length - 1; i >= 0; i--) {
        const j = S.jumpers[i], gr = 900 * j.type.grav;
        const prevY = j.y; j.vy += gr * dt; j.x += j.vx * dt; j.y += j.vy * dt; j.rot += j.vr * dt;
        // rebond sur la toile
        if (prevY < NET_Y && j.y >= NET_Y && j.vy > 0 && Math.abs(j.x - S.px) < 86) {
          j.y = NET_Y; j.vy = -Math.sqrt(2 * gr * rand(300, 360)); j.bounces++; S.squash = 1; SFX.boing(j.type.id === 'piano' ? 0.6 : j.type.id === 'chat' ? 1.5 : 1);
          S.pops.push({ x: j.x, y: NET_Y - 30, txt: 'BOING', life: 0, col: '#ffd34a' });
        }
        // dans l'ambulance
        if (j.x >= AMB.x - 5 && j.y >= GROUND - 125 && j.vy > 0) {   // l'arrière ouvert et le toit : les secouristes rattrapent tout ce qui arrive là
          S.jumpers.splice(i, 1); S.score += j.type.pts; S.saved++; j.type.id === 'piano' ? SFX.piano() : SFX.saved();
          S.pops.push({ x: AMB.x + 30, y: GROUND - 140, txt: `${j.type.name} sauvé${j.type.id === 'mamie' ? 'e' : ''} ! +${j.type.pts}`, life: 0, col: '#7cf09a' });
          continue;
        }
        // chute
        if (j.y > GROUND - j.type.r * 0.6 || j.x > W + 60) {
          S.jumpers.splice(i, 1); S.lives--; SFX.miss();
          S.ghosts.push({ x: j.x, y: GROUND - 20, life: 0 });
          S.pops.push({ x: j.x, y: GROUND - 60, txt: 'AÏE…', life: 0, col: '#ff6a5a' });
          if (S.lives <= 0) end();
          continue;
        }
        drawJumper(j);
      }
      firefighters();
      // fantômes (il s'en remettra, c'est un jeu)
      S.ghosts = S.ghosts.filter(gh => (gh.life += dt) < 2);
      for (const gh of S.ghosts) { g.globalAlpha = 1 - gh.life / 2; g.font = '30px sans-serif'; g.fillText('👻', gh.x - 15, gh.y - gh.life * 60); g.globalAlpha = 1; }
      S.pops = S.pops.filter(p => (p.life += dt) < 1.1);
      for (const p of S.pops) { g.globalAlpha = 1 - p.life / 1.1; g.fillStyle = p.col; g.font = '400 18px Bungee'; g.textAlign = 'center'; g.fillText(p.txt, p.x, p.y - p.life * 40); g.textAlign = 'left'; g.globalAlpha = 1; }
      hud();
    } else {
      if (!S) { S0.px = 640 + Math.sin(t) * 200; }
      firefightersIdle(t);
    }
    // vignette
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  const smokeIdle = [], S0 = { px: 640, squash: 0 };
  function firefightersIdle(t) { const keep = S; S = { ...S0, px: 640 + Math.sin(t * 0.8) * 160 }; firefighters(); S = keep; }
  requestAnimationFrame(frame);

  /* ------------------------------------------------------------------ début et fin */
  function start() {
    audio(); if (ac.state === 'suspended') ac.resume(); SFX.siren();
    reset(); document.getElementById('intro').hidden = true; document.getElementById('over').hidden = true;
  }
  function end() {
    S.on = false;
    const b = best(), rec = S.score > b; if (rec) localStorage.setItem('sauvetage.best', String(S.score));
    const title = S.score >= 40 ? 'Légende de la caserne' : S.score >= 20 ? 'Pompier émérite' : S.score >= 8 ? 'Bonne volonté' : 'Stagiaire';
    document.getElementById('overCard').innerHTML = `<p class="kick">Fin d'intervention</p><div class="big">${S.score}</div><p><b>${title}</b> · ${S.saved} habitant${S.saved > 1 ? 's' : ''} sauvé${S.saved > 1 ? 's' : ''}${rec ? ' · <b style="color:#d8322a">nouveau record !</b>' : ` · record : ${b}`}</p><button class="btn" id="again" type="button">Nouvelle alerte</button>`;
    setTimeout(() => { document.getElementById('over').hidden = false; document.getElementById('again').onclick = start; }, 900);
  }
  document.getElementById('start').addEventListener('click', start);
  window.sauvetage = { get S() { return S; } };   // débogage
})();
