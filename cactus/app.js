/*
 * Déclaration piquante — parodie d'administration fiscale, en six mini-jeux.
 * Rien n'est envoyé nulle part : tout vit dans cette page et disparaît en la fermant.
 */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const stage = $('#stage');
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const euro = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';

const state = { revenue: 0, plucked: 0, pricks: 0, runnerFails: 0, sigTries: 0, step: 0 };
const STEPS = ['Identification', 'Revenus', 'Frais réels', 'Acheminement', 'Signature', 'Calcul'];

/* ------------------------------------------------------------------ son (synthétisé, discret) */
let ac = null;
const audio = () => (ac ??= new (window.AudioContext || window.webkitAudioContext)());
function blip(freq, dur = 0.08, type = 'sine', vol = 0.08, slide = 0) {
  try {
    const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch { /* pas de son, tant pis */ }
}
const sfx = {
  prick: () => { blip(1800, 0.05, 'square', 0.04, 0.5); blip(900, 0.12, 'triangle', 0.05, 0.6); },
  tick: () => blip(2400, 0.02, 'square', 0.02),
  ok: () => { blip(660, 0.12, 'sine', 0.08); setTimeout(() => blip(990, 0.18, 'sine', 0.08), 110); },
  no: () => blip(220, 0.3, 'sawtooth', 0.05, 0.6),
  jump: () => blip(420, 0.12, 'triangle', 0.06, 1.8),
  stamp: () => { blip(90, 0.25, 'sine', 0.25, 0.5); blip(160, 0.08, 'square', 0.06, 0.4); },
  pluck: () => blip(1300, 0.06, 'triangle', 0.06, 1.6),
};

/* ------------------------------------------------------------------ petites choses qui piquent */
function prickAt(x, y, word = 'Aïe') {
  sfx.prick();
  state.pricks++;
  $('#pricks').textContent = state.pricks;
  const d = document.createElement('i'); d.className = 'prick'; d.style.left = x + 'px'; d.style.top = y + 'px';
  const w = document.createElement('span'); w.className = 'ouch'; w.textContent = word; w.style.left = x + 8 + 'px'; w.style.top = y - 18 + 'px';
  document.body.append(d, w);
  setTimeout(() => { d.remove(); w.remove(); }, 1400);
}
const OUCH = ['Aïe', 'Ouille', 'Ouch', 'Aïe !', 'Piqué', 'Hmpf'];
const lastPrick = new WeakMap();
document.addEventListener('pointerover', e => {
  const el = e.target.closest?.('.spiky');
  if (!el || e.pointerType === 'touch') return;
  const now = performance.now();
  if (now - (lastPrick.get(el) ?? 0) < 700) return;
  lastPrick.set(el, now);
  prickAt(e.clientX, e.clientY, OUCH[Math.floor(Math.random() * OUCH.length)]);
});
document.addEventListener('click', e => { if (e.target.closest('a.spiky')) { e.preventDefault(); toast('Ce lien est en cours de piquage. Revenez plus tard.'); } });

let toastT = 0;
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}

/** Modale : renvoie l'index du bouton choisi. */
function modal(title, body, buttons = ['OK']) {
  const m = $('#modal'), card = $('.modal-card', m);
  card.innerHTML = `<h3>${title}</h3>${body}<div class="row end">${buttons.map((b, i) => `<button class="btn ${i < buttons.length - 1 ? 'ghost' : ''}" data-i="${i}">${b}</button>`).join('')}</div>`;
  m.hidden = false;
  $('button:last-child', card).focus();
  return new Promise(res => {
    card.onclick = e => { const b = e.target.closest('button[data-i]'); if (!b) return; m.hidden = true; card.onclick = null; res(+b.dataset.i); };
  });
}

/* ------------------------------------------------------------------ cookies, session */
$('#cookie').addEventListener('click', e => {
  if (!e.target.closest('button')) return;
  $('#cookie').classList.add('gone');
  toast('Merci. Vos épines ont été acceptées (deux fois).');
});

let left = 300;
setInterval(async () => {
  if (!$('#modal').hidden) return;
  left -= Math.random() < 0.06 ? 7 : 1;   // le temps administratif n'est pas linéaire
  if (left <= 0) {
    left = 300;
    await modal('Session expirée', '<p>Pour votre sécurité, votre session a expiré.</p><p class="note">Bonne nouvelle : vos données ont été conservées. Pour une fois.</p>', ['Se reconnecter']);
    toast('Session prolongée de 5 minutes. De rien.');
  }
  const t = $('#timer'); t.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  t.parentElement.classList.toggle('hurry', left < 60);
}, 1000);

/* ------------------------------------------------------------------ étapes */
function renderStepper(on, back = -1) {
  $('#stepper').innerHTML = STEPS.map((s, i) => `<li class="${i < on ? 'done' : ''} ${i === on ? 'on' : ''} ${i === back ? 'back' : ''}">${s}</li>`).join('');
}
function show(html) {
  stage.innerHTML = html;
  stage.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function go(step) {
  state.step = step;
  renderStepper(step - 1);
  ({ 0: home, 1: identify, 2: revenue, 3: deductions, 4: runner, 5: signature, 6: compute }[step])();
}

/* ------------------------------------------------------------------ 0. accueil */
const HERO_SVG = `<svg viewBox="0 0 220 260" aria-hidden="true">
  <ellipse cx="110" cy="246" rx="80" ry="8" fill="rgba(0,0,0,.08)"/>
  <path d="M62 200h96l-10 46H72z" fill="var(--terra)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
  <rect x="56" y="190" width="108" height="16" rx="3" fill="#d27a52" stroke="var(--ink)" stroke-width="3"/>
  <path d="M84 192V70a26 26 0 0 1 52 0v122z" fill="var(--green-2)" stroke="var(--ink)" stroke-width="3"/>
  <path d="M84 150H62a12 12 0 0 1-12-12v-34a10 10 0 0 1 20 0v24h14" fill="var(--green-2)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M136 120h16V96a10 10 0 0 1 20 0v30a14 14 0 0 1-14 14h-22" fill="var(--green-2)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
  <g fill="none" stroke="var(--ink)" stroke-width="3"><circle cx="99" cy="78" r="9" fill="#fff"/><circle cx="123" cy="78" r="9" fill="#fff"/><path d="M108 78h6"/></g>
  <circle cx="100" cy="80" r="2.5" fill="var(--ink)"/><circle cx="122" cy="80" r="2.5" fill="var(--ink)"/>
  <path d="M102 98q8 5 16 0" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
  <path d="M110 108l-6 6 6 40 6-40z" fill="var(--stamp)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>
  <g stroke="var(--ink)" stroke-width="2" stroke-linecap="round">
    <path d="M86 60l-8-3M134 60l8-3M86 130l-8 2M134 128l8 2M86 170l-8 1M134 170l8 1M110 44v-8M56 110l-7-3M166 104l7-3M60 132l-8 2M170 126l8 2"/>
  </g>
  <g transform="rotate(-8 190 70)"><rect x="160" y="40" width="46" height="58" rx="2" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/>
  <path d="M166 52h34M166 60h34M166 68h22M166 80h14" stroke="var(--muted)" stroke-width="2"/><text x="183" y="94" font-size="9" font-family="IBM Plex Mono" text-anchor="middle" fill="var(--stamp)">2042-C</text></g>
</svg>`;

function home() {
  renderStepper(-1);
  show(`
    <div class="card hero">
      <div>
        <span class="case">DÉCLARATION EN LIGNE · 2026</span>
        <h1>Déclarez vos revenus.<br/><em>C'est simple, c'est rapide.</em><sup>*</sup></h1>
        <p class="lead">Six étapes, zéro papier, quelques épines. <sup>*</sup><span class="note">Non.</span></p>
        <div class="flee-zone"><button class="btn" id="startBtn">Commencer ma déclaration</button></div>
        <p class="note">Date limite : hier. <span class="help spiky" title="Aide">?</span></p>
      </div>
      <div class="hero-art">${HERO_SVG}</div>
    </div>
    <div class="facts">
      <div class="fact"><b>97 %</b> des usagers piqués se déclarent « plutôt piqués ».</div>
      <div class="fact"><b>6</b> étapes obligatoires, dont 4 sont des jeux.</div>
      <div class="fact"><b>0</b> donnée transmise. Nous n'avons même pas de serveur.</div>
    </div>`);
  const btn = $('#startBtn'), zone = $('.flee-zone');
  const lines = ['Ah, pas comme ça', 'Encore raté', 'Presque', 'Bon, d\'accord'];
  let flees = 0;
  btn.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse' || flees >= 3) return;
    const maxX = Math.max(0, zone.clientWidth - btn.offsetWidth);
    btn.style.left = Math.round(Math.random() * maxX) + 'px';
    btn.style.top = Math.round(rand(0, 18)) + 'px';
    btn.textContent = lines[flees++];
    sfx.tick();
  });
  btn.addEventListener('click', () => go(1));
}

/* ------------------------------------------------------------------ 1. identification */
const TILES = [
  { e: '🌵', c: true }, { e: '🦔', c: false }, { e: '🥒', c: false },
  { e: '🌵', c: true }, { e: '🍍', c: false }, { e: '🐡', c: false },
  { e: '🪴', c: false }, { e: '🌵', c: true }, { e: '🤠', c: false },
];
function identify() {
  show(`
    <div class="card">
      <span class="case">ÉTAPE 1 · IDENTIFICATION</span>
      <h1>Prouvez que vous n'êtes pas un cactus</h1>
      <p class="lead">Conformément à l'article L.42 du Code des Épines, les cactus ne sont pas autorisés à déclarer leurs revenus eux-mêmes.</p>
      <div class="captcha">
        <label><span class="box" id="cbox"></span> Je ne suis pas un cactus</label>
        <small>🌵<br/>AntiCactus™<br/>Confidentialité</small>
      </div>
    </div>
    <div class="card" id="codeCard" hidden>
      <h2 class="req">Code piquant</h2>
      <p class="lead">Votre code vous a été envoyé par pigeon voyageur : <span class="pigeon">4 8 1 5 1 6</span></p>
      <div class="code" id="code">${'<span></span>'.repeat(6)}</div>
      <div class="pad" id="pad"></div>
      <p class="note">Pour votre sécurité, le clavier se mélange après chaque chiffre.</p>
    </div>`);
  const box = $('#cbox');
  $('.captcha label').addEventListener('click', async () => {
    if (box.classList.contains('ok') || box.classList.contains('spin')) return;
    box.classList.add('spin');
    await wait(900);
    box.classList.remove('spin');
    let tries = 0;
    for (;;) {
      const sel = new Set();
      const pick = modal('', `
        <div class="captcha-head">Sélectionnez toutes les images contenant <b>un cactus</b></div>
        <div class="grid9">${TILES.map((t, i) => `<div class="tile" data-i="${i}" role="button" tabindex="0" aria-label="image ${i + 1}">${t.e}</div>`).join('')}</div>`, ['Valider']);
      $('.grid9').onclick = e => { const t = e.target.closest('.tile'); if (!t) return; t.classList.toggle('sel'); sfx.tick(); sel.has(+t.dataset.i) ? sel.delete(+t.dataset.i) : sel.add(+t.dataset.i); };
      await pick;
      tries++;
      if (tries === 1) {
        const hedgehog = sel.has(1);
        sfx.no();
        await modal('Vérification échouée', hedgehog ? '<p>Un hérisson n\'est pas un cactus. Enfin, on pense.</p>' : '<p>Vous avez oublié le hérisson. Il est très piquant, ça compte.</p>', ['Réessayer']);
        continue;
      }
      break;
    }
    box.classList.add('ok'); sfx.ok();
    toast('Vérification réussie : vous êtes probablement humain (à 61 %).');
    $('#codeCard').hidden = false;
    setupPad();
  });

  function setupPad() {
    const target = '481516';
    let typed = '';
    const pad = $('#pad'), code = $('#code');
    const keys = () => {
      const d = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].sort(() => Math.random() - 0.5);
      pad.innerHTML = [...d.slice(0, 9), '⌫', d[9], '✓'].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('');
    };
    const paint = () => $$('span', code).forEach((s, i) => { s.textContent = typed[i] ?? ''; s.classList.toggle('f', i < typed.length); });
    keys();
    pad.addEventListener('click', async e => {
      const k = e.target.closest('button')?.dataset.k; if (!k) return;
      if (k === '⌫') typed = typed.slice(0, -1);
      else if (k === '✓') {
        if (typed === target) { sfx.ok(); toast('Code accepté. Le pigeon vous salue.'); await wait(600); return go(2); }
        sfx.no(); code.classList.add('shake'); setTimeout(() => code.classList.remove('shake'), 400); typed = ''; paint(); return;
      } else if (typed.length < 6) typed += k;
      sfx.tick(); paint();
      pad.classList.add('shuffling'); await wait(150); keys(); pad.classList.remove('shuffling');
    });
  }
}

/* ------------------------------------------------------------------ 2. revenus : machine à sous */
function revenue() {
  show(`
    <div class="card">
      <span class="case">ÉTAPE 2 · CASE 1AJ</span>
      <h1>Salaires, traitements, épines</h1>
      <p class="lead">Pour limiter les erreurs de saisie, le montant de vos revenus est désormais déterminé par tirage. Arrêtez les rouleaux un par un (clic sur le rouleau, ou <kbd>Espace</kbd>).</p>
      <div class="slots" id="slots">${Array.from({ length: 6 }, (_, i) => `${i === 3 ? '<span class="sep"></span>' : ''}<div class="reel" data-i="${i}"><div class="strip">${'0123456789'.repeat(3).split('').map(d => `<div>${d}</div>`).join('')}</div></div>`).join('')}<span class="eur">€</span></div>
      <div class="row end"><button class="btn ghost" id="relaunch" hidden>Relancer</button><button class="btn" id="stopBtn">Stop</button></div>
    </div>`);
  const reels = $$('.reel').map((el, i) => ({ el, strip: $('.strip', el), pos: rand(0, 10), speed: rand(9, 15) + i * 1.3, stopped: false, digit: 0 }));
  let next = 0, raf = 0, last = performance.now(), done = false;
  const H = () => reels[0].el.clientHeight;
  const loop = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const r of reels) {
      if (!r.stopped) { r.pos = (r.pos + r.speed * dt) % 10; if (Math.random() < 0.08) sfx.tick(); }
      r.strip.style.transform = `translateY(${-(r.pos + 10) * H()}px)`;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const stop = () => {
    if (done || next >= reels.length) return;
    const r = reels[next++];
    r.stopped = true;
    r.digit = Math.round(r.pos) % 10;
    const from = r.pos, to = Math.round(r.pos), t0 = performance.now();
    const settle = now => { const k = Math.min(1, (now - t0) / 220); r.pos = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(settle); else r.pos = to % 10; };
    requestAnimationFrame(settle);
    r.el.classList.add('stopped'); sfx.tick();
    if (next === reels.length) finish();
  };
  const finish = async () => {
    done = true;
    await wait(400);
    state.revenue = +reels.map(r => r.digit).join('');
    const ans = await modal('Confirmation du montant', `<p>Vous déclarez <b>${euro(state.revenue)}</b> de revenus.</p><p class="note">${state.revenue > 500000 ? 'C\'est beaucoup. Félicitations, et bon courage.' : state.revenue < 15000 ? 'Ce montant est modeste. Nous le prendrons quand même.' : 'Ce montant nous semble crédible. C\'est suspect.'}</p>`, ['Non, relancer', 'Oui', 'Oui, mais en plus triste']);
    if (ans === 0) { cancelAnimationFrame(raf); return revenue(); }
    cancelAnimationFrame(raf); window.removeEventListener('keydown', key);
    go(3);
  };
  const key = e => { if (e.code === 'Space' && state.step === 2) { e.preventDefault(); stop(); } };
  window.addEventListener('keydown', key);
  $('#slots').addEventListener('click', e => { if (e.target.closest('.reel')) stop(); });
  $('#stopBtn').addEventListener('click', stop);
}

/* ------------------------------------------------------------------ 3. frais réels : épiler le cactus */
function deductions() {
  // petite fausse alerte dans le fil d'étapes
  renderStepper(2, 0);
  toast('Retour à l\'étape 1… Non, fausse alerte.');
  setTimeout(() => renderStepper(2), 1400);
  show(`
    <div class="card">
      <span class="case">ÉTAPE 3 · CASE 1AK · FRAIS RÉELS</span>
      <h1>Déduisez vos épines</h1>
      <p class="lead">Chaque épine retirée est déductible à hauteur de <b>152 €</b> (barème kilométrique épineux). Vous avez <b>15 secondes</b>. Visez bien les épines : le cactus, lui, pique.</p>
      <div class="hud"><span>Épines retirées : <b id="pl">0</b></span><span>Déduction : <b id="de">0 €</b></span><span>Temps : <b id="tm">15.0</b> s</span></div>
      <div class="game" id="g"><canvas width="760" height="440"></canvas><div class="overlay" id="ov"><div><p>Prenez la pince.</p><button class="btn" id="go">Commencer l'épilation</button></div></div></div>
    </div>`);
  const cv = $('#g canvas'), ctx = cv.getContext('2d'), W = 760, H = 440;
  // le cactus : un tronc, deux bras (rectangles arrondis)
  const parts = [
    { x: 330, y: 70, w: 100, h: 330, r: 50 },
    { x: 230, y: 170, w: 60, h: 120, r: 30 }, { x: 230, y: 250, w: 110, h: 50, r: 25 },
    { x: 470, y: 130, w: 60, h: 110, r: 30 }, { x: 420, y: 210, w: 110, h: 50, r: 25 },
  ];
  const inBody = (x, y) => parts.some(p => x > p.x - 2 && x < p.x + p.w + 2 && y > p.y - 2 && y < p.y + p.h + 2 && roundHit(p, x, y));
  function roundHit(p, x, y) {
    const cx = Math.max(p.x + p.r, Math.min(x, p.x + p.w - p.r)), cy = Math.max(p.y + p.r, Math.min(y, p.y + p.h - p.r));
    return (x - cx) ** 2 + (y - cy) ** 2 <= p.r ** 2 || (x >= p.x + p.r && x <= p.x + p.w - p.r) || (y >= p.y + p.r && y <= p.y + p.h - p.r);
  }
  // épines : on échantillonne le vrai contour de chaque partie (côtés droits + arrondis), normale vers l'extérieur
  const spines = [];
  const strictlyIn = (q, x, y) => x > q.x + 3 && x < q.x + q.w - 3 && y > q.y + 3 && y < q.y + q.h - 3 && roundHit(q, x, y);
  for (const p of parts) {
    const r = p.r, sw = p.w - 2 * r, sh = p.h - 2 * r, P = 2 * sw + 2 * sh + 2 * Math.PI * r;
    for (let i = 0; i < 160; i++) {
      let u = Math.random() * P, bx, by, nx, ny;
      const corner = (cx, cy, a0) => { const a = a0 + (u / r); bx = cx + Math.cos(a) * r; by = cy + Math.sin(a) * r; nx = Math.cos(a); ny = Math.sin(a); };
      if (u < sw) { bx = p.x + r + u; by = p.y; nx = 0; ny = -1; }
      else if ((u -= sw) < Math.PI / 2 * r) corner(p.x + p.w - r, p.y + r, -Math.PI / 2);
      else if ((u -= Math.PI / 2 * r) < sh) { bx = p.x + p.w; by = p.y + r + u; nx = 1; ny = 0; }
      else if ((u -= sh) < Math.PI / 2 * r) corner(p.x + p.w - r, p.y + p.h - r, 0);
      else if ((u -= Math.PI / 2 * r) < sw) { bx = p.x + p.w - r - u; by = p.y + p.h; nx = 0; ny = 1; }
      else if ((u -= sw) < Math.PI / 2 * r) corner(p.x + r, p.y + p.h - r, Math.PI / 2);
      else if ((u -= Math.PI / 2 * r) < sh) { bx = p.x; by = p.y + p.h - r - u; nx = -1; ny = 0; }
      else { u -= sh; corner(p.x + r, p.y + r, Math.PI); }
      const len = rand(11, 17), tx = bx + nx * len, ty = by + ny * len;
      if (by > 372 || parts.some(q => q !== p && (strictlyIn(q, bx, by) || strictlyIn(q, tx, ty)))) continue;   // jonctions et pot
      if (spines.some(o => (o.bx - bx) ** 2 + (o.by - by) ** 2 < 17 ** 2)) continue;
      spines.push({ bx, by, nx, ny, len, out: false, fx: 0, fy: 0, vx: 0, vy: 0, rot: 0 });
    }
  }
  let t = 15, running = false, last = 0, mouse = { x: -99, y: -99 };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#efe2c4'; ctx.fillRect(0, 395, W, 45);
    for (const p of parts) { ctx.fillStyle = '#4f9a6e'; rr(p); ctx.fill(); }
    for (const p of parts) { ctx.strokeStyle = '#1d2a24'; ctx.lineWidth = 3; rr(p); ctx.stroke(); }
    // on remplit à nouveau chaque partie un peu rentrée : les contours intérieurs (jonctions des bras) disparaissent
    ctx.fillStyle = '#4f9a6e';
    for (const p of parts) { ctx.beginPath(); ctx.roundRect(p.x + 1.6, p.y + 1.6, p.w - 3.2, p.h - 3.2, p.r - 1.6); ctx.fill(); }
    ctx.strokeStyle = 'rgba(29,42,36,.18)'; ctx.lineWidth = 2;
    for (const dx of [28, 50, 72]) { ctx.beginPath(); ctx.moveTo(330 + dx, 100); ctx.lineTo(330 + dx, 390); ctx.stroke(); }
    ctx.fillStyle = '#c0623a'; ctx.strokeStyle = '#1d2a24'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(296, 372); ctx.lineTo(464, 372); ctx.lineTo(448, 434); ctx.lineTo(312, 434); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d27a52'; ctx.beginPath(); ctx.roundRect(288, 364, 184, 18, 3); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'round';
    for (const s of spines) {
      if (s.out) {
        ctx.save(); ctx.translate(s.fx, s.fy); ctx.rotate(s.rot); ctx.strokeStyle = '#7a6a48'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s.len, 0); ctx.stroke(); ctx.restore();
      } else {
        ctx.strokeStyle = '#3e3a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.bx, s.by); ctx.lineTo(s.bx + s.nx * s.len, s.by + s.ny * s.len); ctx.stroke();
      }
    }
    // la pince
    if (running) {
      ctx.save(); ctx.translate(mouse.x, mouse.y); ctx.rotate(-0.6);
      ctx.strokeStyle = '#8b9196'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(46, -9); ctx.moveTo(0, 2); ctx.lineTo(46, 9); ctx.stroke();
      ctx.restore();
    }
  };
  function rr(p) { ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, p.r); }
  const toCanvas = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height }; };
  cv.addEventListener('pointermove', e => { mouse = toCanvas(e); });
  cv.addEventListener('pointerdown', e => {
    if (!running) return;
    const m = toCanvas(e); mouse = m;
    let best = null, bd = 18 ** 2;
    for (const s of spines) {
      if (s.out) continue;
      const mx = s.bx + s.nx * s.len * 0.6, my = s.by + s.ny * s.len * 0.6, d = (mx - m.x) ** 2 + (my - m.y) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    if (best) {
      best.out = true; best.fx = best.bx; best.fy = best.by; best.vx = best.nx * rand(160, 320) + rand(-60, 60); best.vy = -rand(220, 420); best.rot = Math.atan2(best.ny, best.nx);
      state.plucked++; sfx.pluck();
      $('#pl').textContent = state.plucked; $('#de').textContent = euro(state.plucked * 152);
    } else if (inBody(m.x, m.y)) {
      prickAt(e.clientX, e.clientY, 'Le cactus se défend');
    }
  });
  const loop = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running) {
      t = Math.max(0, t - dt); $('#tm').textContent = t.toFixed(1);
      if (t === 0) { running = false; end(); }
    }
    for (const s of spines) if (s.out) { s.vy += 900 * dt; s.fx += s.vx * dt; s.fy += s.vy * dt; s.rot += dt * 8; }
    draw();
    if (state.step === 3) requestAnimationFrame(loop);
  };
  requestAnimationFrame(n => { last = n; loop(n); });
  $('#go').addEventListener('click', () => { state.plucked = 0; $('#ov').hidden = true; running = true; cv.style.cursor = 'none'; });
  async function end() {
    cv.style.cursor = '';
    sfx.ok();
    const pct = Math.round(state.plucked / spines.length * 100);
    await modal('Frais réels enregistrés', `<p><b>${state.plucked}</b> épines retirées (${pct} % du cactus), soit <b>${euro(state.plucked * 152)}</b> de déduction.</p><p class="note">${pct > 60 ? 'Le cactus vous en voudra longtemps.' : 'Le cactus vous remercie pour votre modération.'}</p>`, ['Continuer']);
    go(4);
  }
}

/* ------------------------------------------------------------------ 4. acheminement : le coureur */
function runner() {
  show(`
    <div class="card">
      <span class="case">ÉTAPE 4 · TRANSMISSION SÉCURISÉE</span>
      <h1>Acheminez votre déclaration</h1>
      <p class="lead">Le réseau étant en maintenance, votre déclaration doit rejoindre le Centre des Finances Piquantes <b>à pied</b>, à travers le désert. Sautez par-dessus les cactus (<kbd>Espace</kbd>, clic ou toucher).</p>
      <div class="hud"><span>Distance restante : <b id="dist">400 m</b></span><span>Tentatives : <b id="fails">${state.runnerFails}</b></span></div>
      <div class="game" id="g"><canvas width="760" height="250"></canvas><div class="overlay" id="ov"><div><p>Votre déclaration est prête à courir.</p><button class="btn" id="go">Partir</button></div></div></div>
      <div class="row end"><button class="btn ghost" id="post" ${state.runnerFails >= 3 ? '' : 'hidden'}>Envoyer par la poste (délai : 6 à 8 ans)</button></div>
    </div>`);
  const cv = $('#g canvas'), ctx = cv.getContext('2d'), W = 760, H = 250, GROUND = 205;
  const GOAL = 400;   // ~23 s de course : la vitesse finale reste jouable
  let p, obs, clouds, speed, dist, spawnIn, running = false, last = 0, over = false, t = 0;
  const reset = () => {
    p = { x: 90, y: GROUND, vy: 0, w: 28, h: 36, onGround: true };
    obs = []; speed = 330; dist = 0; spawnIn = 1; t = 0;
    clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 220 + rand(0, 100), y: rand(20, 80), s: rand(0.6, 1.2) }));
  };
  reset();
  const jump = () => {
    if (!running) return;
    if (p.onGround) { p.vy = -720; p.onGround = false; sfx.jump(); }
  };
  const key = e => { if ((e.code === 'Space' || e.code === 'ArrowUp') && state.step === 4) { e.preventDefault(); jump(); } };
  window.addEventListener('keydown', key);
  cv.addEventListener('pointerdown', jump);

  const drawCactus = (o) => {
    ctx.fillStyle = '#4f9a6e'; ctx.strokeStyle = '#1d2a24'; ctx.lineWidth = 2.5;
    const x = o.x, y = GROUND - o.h, w = o.w;
    ctx.beginPath(); ctx.roundRect(x, y, w, o.h, [w / 2, w / 2, 2, 2]); ctx.fill(); ctx.stroke();
    if (o.arms) {
      ctx.beginPath(); ctx.roundRect(x - 10, y + o.h * 0.25, 10, o.h * 0.3, 5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x + w, y + o.h * 0.15, 10, o.h * 0.32, 5); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(29,42,36,.6)'; ctx.lineWidth = 1.5;
    for (let k = 8; k < o.h; k += 10) { ctx.beginPath(); ctx.moveTo(x, y + k); ctx.lineTo(x - 4, y + k - 2); ctx.moveTo(x + w, y + k); ctx.lineTo(x + w + 4, y + k - 2); ctx.stroke(); }
  };
  const drawWeed = (o) => {
    ctx.save(); ctx.translate(o.x + o.w / 2, GROUND - o.w / 2); ctx.rotate(-t * 8);
    ctx.strokeStyle = '#a07b45'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(rand(-2, 2), rand(-2, 2), o.w / 2 - (k % 3) * 3, k, k + 4.2); ctx.stroke(); }
    ctx.restore();
  };
  const drawPaper = () => {
    const run = p.onGround ? Math.sin(t * 22) : 0.6;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.strokeStyle = '#1d2a24'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(10 + run * 6, 0); ctx.moveTo(18, -6); ctx.lineTo(18 - run * 6, 0); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -6 - p.h); ctx.lineTo(p.w - 8, -6 - p.h); ctx.lineTo(p.w, -6 - p.h + 8); ctx.lineTo(p.w, -6); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = '#8a9690'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(5, -34 + k * 7); ctx.lineTo(p.w - 6, -34 + k * 7); ctx.stroke(); }
    ctx.fillStyle = '#1d2a24'; ctx.beginPath(); ctx.arc(p.w - 9, -32, 2, 0, 7); ctx.fill();
    ctx.restore();
  };
  const draw = () => {
    ctx.fillStyle = '#fbf4e4'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f2c97a'; ctx.beginPath(); ctx.arc(640, 60, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#efe0bf'; for (const c of clouds) { ctx.beginPath(); ctx.ellipse(c.x, c.y, 40 * c.s, 10 * c.s, 0, 0, 7); ctx.fill(); }
    // mesas au loin
    ctx.fillStyle = '#ead2a8'; ctx.beginPath(); ctx.moveTo(0, GROUND); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, GROUND - 40 - 18 * Math.sin((x + dist * 4) / 90)); ctx.lineTo(W, GROUND); ctx.fill();
    ctx.fillStyle = '#e4cc9c'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = '#1d2a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
    ctx.fillStyle = '#c9ad78'; for (let k = 0; k < 14; k++) { const x = ((k * 97 - dist * 24) % W + W) % W; ctx.fillRect(x, GROUND + 12 + (k % 3) * 9, 6, 2); }
    // le centre des finances, quand on approche
    const bx = 300 + (GOAL - dist) * 18;   // le centre apparaît à l'horizon dans les 60 derniers mètres
    if (bx < W + 200) {
      ctx.fillStyle = '#fffdf8'; ctx.strokeStyle = '#1d2a24'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(bx, GROUND - 110, 150, 110); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 10, GROUND - 110); ctx.lineTo(bx + 75, GROUND - 150); ctx.lineTo(bx + 160, GROUND - 110); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f6b4f'; ctx.font = '600 10px Inter'; ctx.fillText('FINANCES PIQUANTES', bx + 18, GROUND - 92);
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.rect(bx + 16 + k * 34, GROUND - 78, 12, 78); ctx.stroke(); }
    }
    for (const o of obs) o.kind === 'weed' ? drawWeed(o) : drawCactus(o);
    drawPaper();
  };
  const loop = now => {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (running) {
      t += dt; speed += 9 * dt;
      const remaining = GOAL - dist;
      dist += speed * dt / 24;
      $('#dist').textContent = Math.max(0, Math.ceil(GOAL - dist)) + ' m';
      p.vy += 2100 * dt; p.y += p.vy * dt;
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
      for (const c of clouds) { c.x -= speed * 0.08 * dt; if (c.x < -80) c.x = W + 80; }
      spawnIn -= dt;
      if (spawnIn <= 0 && remaining > 30) {
        const weed = Math.random() < 0.22;
        obs.push(weed ? { kind: 'weed', x: W + 20, w: 26, h: 26 } : { kind: 'cactus', x: W + 20, w: rand(14, 22), h: rand(32, 58), arms: Math.random() < 0.5 });
        if (Math.random() < 0.18 && !weed) obs.push({ kind: 'cactus', x: W + 46, w: 14, h: rand(28, 40), arms: false });
        spawnIn = rand(0.85, 1.6) * 330 / speed + 0.25;
      }
      for (const o of obs) o.x -= speed * dt * (o.kind === 'weed' ? 1.25 : 1);
      obs = obs.filter(o => o.x > -60);
      // collision (boîtes un peu indulgentes)
      for (const o of obs) {
        const ox = o.x + 3, ow = o.w - 6, oh = (o.kind === 'weed' ? o.w : o.h) - 4;
        if (p.x + 4 < ox + ow && p.x + p.w - 4 > ox && p.y - 3 > GROUND - oh) { crash(); break; }
      }
      if (dist >= GOAL) win();
    }
    draw();
    if (state.step === 4) requestAnimationFrame(loop);
  };
  requestAnimationFrame(n => { last = n; loop(n); });
  const start = () => { reset(); $('#ov').hidden = true; running = true; over = false; };
  $('#go').addEventListener('click', start);
  async function crash() {
    if (over) return; over = true; running = false;
    state.runnerFails++; $('#fails').textContent = state.runnerFails;
    sfx.no(); prickAt(innerWidth / 2, innerHeight / 2, 'Déclaration piquée');
    if (state.runnerFails >= 3) $('#post').hidden = false;
    const ov = $('#ov'); ov.hidden = false;
    ov.innerHTML = `<div><p><b>Votre déclaration a été piquée.</b><br/>Elle est désormais trouée et donc irrecevable.</p><button class="btn" id="go">Imprimer un nouvel exemplaire</button></div>`;
    $('#go').addEventListener('click', start);
  }
  async function win() {
    running = false; over = true; sfx.ok();
    window.removeEventListener('keydown', key);
    await modal('Déclaration réceptionnée', `<p>Votre déclaration est arrivée au Centre des Finances Piquantes après ${state.runnerFails} tentative${state.runnerFails > 1 ? 's' : ''} infructueuse${state.runnerFails > 1 ? 's' : ''}.</p><p class="note">Elle est un peu essoufflée, mais lisible.</p>`, ['Continuer']);
    go(5);
  }
  $('#post').addEventListener('click', async () => {
    running = false;
    await modal('Envoi postal', '<p>Votre déclaration sera traitée dans un délai de 6 à 8 ans.</p><p class="note">Pour accélérer la démo, nous avons fait semblant d\'attendre.</p>', ['Merci']);
    window.removeEventListener('keydown', key);
    go(5);
  });
}

/* ------------------------------------------------------------------ 5. signature */
function signature() {
  show(`
    <div class="card">
      <span class="case">ÉTAPE 5 · SIGNATURE ÉLECTRONIQUE</span>
      <h1>Signez ici</h1>
      <p class="lead">Votre signature doit être <b>strictement identique</b> à celle déposée lors de votre première déclaration, en 2009, avec un stylo qui fuyait.</p>
      <div class="game" id="g" style="max-width:640px"><canvas width="640" height="230"></canvas></div>
      <p class="note" id="sigNote">Signez avec la souris ou le doigt. Le stylo est un cactus : c'est normal.</p>
      <div class="row end"><button class="btn ghost" id="clear">Effacer</button><button class="btn" id="ok">Valider la signature</button></div>
    </div>`);
  const cv = $('#g canvas'), ctx = cv.getContext('2d'), W = 640, H = 230;
  let drawing = false, lastPt = null, length = 0, acc = 0;
  const base = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#d9cdb4'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, 170); ctx.lineTo(W - 40, 170); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#b9ad94'; ctx.font = '500 13px Inter'; ctx.fillText('✕', 30, 166);
  };
  base();
  const pt = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height }; };
  cv.addEventListener('pointerdown', e => { drawing = true; lastPt = pt(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drawing) return;
    const q = pt(e), dx = q.x - lastPt.x, dy = q.y - lastPt.y, d = Math.hypot(dx, dy);
    if (d < 1) return;
    ctx.strokeStyle = '#2f6b4f'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lastPt.x, lastPt.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    // le trait est piquant : de petites épines perpendiculaires
    acc += d;
    while (acc > 11) {
      acc -= 11;
      const nx = -dy / d, ny = dx / d, side = Math.random() < 0.5 ? 1 : -1;
      ctx.strokeStyle = '#3e3a2a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + nx * 7 * side + dx / d * 3, q.y + ny * 7 * side + dy / d * 3); ctx.stroke();
    }
    length += d; lastPt = q;
  });
  window.addEventListener('pointerup', () => { drawing = false; }, { once: false });
  $('#clear').addEventListener('click', () => { base(); length = 0; });
  $('#ok').addEventListener('click', async () => {
    if (length < 180) { sfx.no(); $('#sigNote').textContent = 'Signature trop courte. Même votre stylo de 2009 faisait mieux.'; return; }
    state.sigTries++;
    const note = $('#sigNote'); $('#ok').disabled = true;
    note.textContent = 'Comparaison avec votre signature de 2009…'; await wait(1500);
    if (state.sigTries === 1) {
      sfx.no(); $('#ok').disabled = false;
      await modal('Signature non conforme', '<p>Écart constaté avec la signature de référence : <b>0,3 mm</b>.</p><p class="note">Merci de signer à nouveau, en pensant très fort à 2009.</p>', ['Recommencer']);
      base(); length = 0; note.textContent = 'Deuxième essai. Pensez à 2009.';
      return;
    }
    sfx.ok(); note.textContent = 'Signature conforme à 51 %. C\'est suffisant.';
    await wait(900);
    go(6);
  });
}

/* ------------------------------------------------------------------ 6. calcul et accusé de réception */
function taxOf(income) {
  const brackets = [[11294, 0], [28797, 0.11], [82341, 0.3], [177106, 0.41], [Infinity, 0.45]];
  let tax = 0, prev = 0;
  for (const [cap, rate] of brackets) { if (income > prev) tax += (Math.min(income, cap) - prev) * rate; prev = cap; }
  return Math.round(tax);
}
async function compute() {
  renderStepper(5);
  show(`
    <div class="card">
      <span class="case">ÉTAPE 6 · CALCUL</span>
      <h1>Calcul de votre impôt</h1>
      <p class="lead">Merci de ne pas fermer cette page, ni de la regarder trop fixement.</p>
      <div class="bar"><i id="bar"></i></div>
      <div class="calc-msg" id="msg"></div>
    </div>`);
  const bar = $('#bar'), msg = $('#msg');
  const steps = [
    [18, 'Lecture de votre déclaration essoufflée…'], [37, 'Application du quotient familial épineux…'], [58, 'Consultation de l\'oracle du désert…'],
    [99, 'Presque terminé…'], [12, 'Mise à jour du barème (le barème a changé).'], [64, 'Recalcul…'], [100, 'Terminé.'],
  ];
  for (const [p, m] of steps) { bar.style.width = p + '%'; msg.textContent = m; await wait(p === 99 ? 1500 : 950); }
  const deduction = state.plucked * 152, taxable = Math.max(0, state.revenue - deduction);
  const tax = taxOf(taxable), tve = Math.round(taxable * 0.0042), discount = state.pricks * 1, total = Math.max(0, tax + tve - discount);
  const no = 'CAC-2026-' + Math.floor(rand(100000, 999999));
  show(`
    <div class="card">
      <span class="case">ACCUSÉ DE RÉCEPTION</span>
      <h1>Votre déclaration a bien été piquée</h1>
      <p class="lead">Conservez cet accusé de réception pendant 40 ans, dans un endroit sec.</p>
      <div class="receipt">
        <div class="stamp" id="stamp">PIQUÉ<small>${new Date().toLocaleDateString('fr-FR')}</small></div>
        <p>N° ${no}<br/>Déclaration 2042-C (cactus)</p>
        <table>
          <tr><td>Revenus déclarés (tirage)</td><td>${euro(state.revenue)}</td></tr>
          <tr><td>Frais réels (${state.plucked} épines × 152 €)</td><td>− ${euro(deduction)}</td></tr>
          <tr><td>Revenu imposable</td><td>${euro(taxable)}</td></tr>
          <tr><td>Impôt sur le revenu</td><td>${euro(tax)}</td></tr>
          <tr><td>Taxe sur la valeur épineuse (0,42 %)</td><td>${euro(tve)}</td></tr>
          <tr><td>Remise « piqûres subies » (${state.pricks} × 1 €)</td><td>− ${euro(discount)}</td></tr>
          <tr class="total"><td><b>Montant dû</b></td><td><b>${euro(total)}</b></td></tr>
        </table>
        <p class="note" style="margin-top:14px">Soit, au cours du jour, ${Math.max(1, Math.round(total / 152)).toLocaleString('fr-FR')} épine${total >= 304 ? 's' : ''}. Paiement accepté en épines, en eau, ou pas du tout (ceci est une parodie).</p>
      </div>
      <div class="row end"><button class="btn ghost" id="contest">Contester</button><button class="btn" id="again">Recommencer (c'était si agréable)</button></div>
    </div>`);
  await wait(500);
  $('#stamp').classList.add('down'); setTimeout(() => { sfx.stamp(); document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 300); }, 300);
  $('#contest').addEventListener('click', () => modal('Contestation', '<p>Le service contestation est ouvert les jours se terminant par « di », de 14 h 02 à 14 h 07.</p><p class="note">Merci de vous munir du formulaire 2042-RECLAM (47 pages, recto uniquement).</p>', ['D\'accord']));
  $('#again').addEventListener('click', () => { Object.assign(state, { revenue: 0, plucked: 0, runnerFails: 0, sigTries: 0 }); go(0); });
}

window.declaration = { go, state };   // pour déboguer depuis la console
go(0);
