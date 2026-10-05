/*
 * Lundi, 7 h 52 — Michel dort, la réunion est à 8 h. Une gifle = un balayage rapide sur son visage.
 * Tout est en SVG (la scène) + un canvas par-dessus pour les effets ; le son est synthétisé.
 */

const $ = s => document.querySelector(s);
const scene = $('#scene'), stage = $('#stage'), head = $('#head');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ état */
const PIVOT = { x: 800, y: 520 }, NECK = 100, HEAD_R = 104;
const S = {
  phase: 'intro',            // intro · play · won · lost
  wake: 0, slaps: 0, power: 0, lastSlap: -9, gameSec: 0,
  angle: -16, angVel: 0, squash: 0, squashVel: 0,
  red: { L: 0, R: 0 }, print: { L: 0, R: 0 },
  dreamOut: false, dreamBackAt: 0, mugSpilled: false, papersGone: false,
  flashEyes: 0, t: 0, hits: [], blockUntil: 0, relapseAt: 9,
};
const DREAMS = ['🐑', '🏖️', '🥐', '🛌', '🦄', '🍕', '🎣', '🏝️'];
const LINES = {
  deep: ['zzz… 5 minutes…', 'Maman, pas l\'école…', 'mmh… croissant…', '*ronfle plus fort*', 'Pas maintenant, Gérard…', 'zzz… fichier final_v8…'],
  light: ['Quoi ? …non.', 'Je suis réveillé. (il ne l\'est pas)', 'C\'est samedi ?', 'J\'écoute, j\'écoute…', 'Qui a éteint le week-end ?', 'mmh… j\'arrive…'],
  groggy: ['Aïe ! OK, OK…', 'Qui a mis un lundi un lundi ?', 'Café… café…', 'J\'ai les yeux ouverts, là ?', 'Encore une et je démissionne.', 'C\'était quoi, ce bruit ?'],
};
const WORDS = ['PAF !', 'CLAC !', 'SHLAK !', 'PIF !', 'SLAP !', 'POF !', 'TCHAC !'];
const stageOf = w => (w < 35 ? 'deep' : w < 70 ? 'light' : 'groggy');

/* ------------------------------------------------------------------ coordonnées SVG <-> écran */
const svgPt = (x, y) => { const p = scene.createSVGPoint(); p.x = x; p.y = y; return p; };
const toSvg = (cx, cy) => svgPt(cx, cy).matrixTransform(scene.getScreenCTM().inverse());
const toScreen = (x, y) => svgPt(x, y).matrixTransform(scene.getScreenCTM());
const headCenter = () => {
  const a = S.angle * Math.PI / 180;
  return { x: PIVOT.x + Math.sin(a) * NECK, y: PIVOT.y - Math.cos(a) * NECK };
};

/* ------------------------------------------------------------------ son */
let ac = null, master, snoreGain, alarmGain, muted = false;
function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  // ronflement : bruit brun filtré, dont le volume suit la respiration
  const len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 240; bp.Q.value = 1.8;
  snoreGain = ac.createGain(); snoreGain.gain.value = 0;
  src.connect(bp); bp.connect(snoreGain); snoreGain.connect(master); src.start();
  // réveil : bips carrés, discrets
  const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 1760;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
  alarmGain = ac.createGain(); alarmGain.gain.value = 0;
  o.connect(lp); lp.connect(alarmGain); alarmGain.connect(master); o.start();
}
let noiseBuf = null;
function slapSound(s) {
  if (!ac) return;
  const t = ac.currentTime;
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const n = ac.createBufferSource(); n.buffer = noiseBuf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700 + s * 900; bp.Q.value = 0.9;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35 + s * 0.5, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09 + s * 0.05);
  n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.2);
  // le « poc » grave de la joue
  const o = ac.createOscillator(), og = ac.createGain();
  o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  og.gain.setValueAtTime(0.25 + s * 0.35, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.16);
}
function blip(f, d = 0.12, type = 'triangle', v = 0.08, slide = 1) {
  if (!ac) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}
/** un « mmh » endormi : triangle grave avec vibrato */
function mumble() {
  if (!ac) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(rand(150, 210), t); o.frequency.linearRampToValueAtTime(rand(110, 150), t + 0.35);
  lfo.frequency.value = 7; lg.gain.value = 8; lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.42); lfo.stop(t + 0.42);
}
$('#mute').addEventListener('click', () => {
  muted = !muted; $('#mute').textContent = muted ? '🔇' : '🔊'; $('#mute').setAttribute('aria-pressed', String(muted));
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.05);
});

/* ------------------------------------------------------------------ effets (canvas) */
const fx = $('#fx'), g2 = fx.getContext('2d');
let parts = [];
function resize() { const dpr = Math.min(2, devicePixelRatio || 1); fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; g2.setTransform(dpr, 0, 0, dpr, 0, 0); }
addEventListener('resize', resize); resize();
function burst(x, y, s, dir) {
  parts.push({ k: 'word', x, y, vx: dir * 60, vy: -80, life: 0.8, max: 0.8, txt: pick(WORDS), size: 30 + s * 30, rot: rand(-0.3, 0.3) });
  for (let i = 0; i < 6 + s * 10; i++) {
    const a = rand(0, Math.PI * 2), v = rand(140, 420) * (0.5 + s);
    parts.push({ k: 'star', x, y, vx: Math.cos(a) * v + dir * 120, vy: Math.sin(a) * v, life: rand(0.3, 0.6), max: 0.6, size: rand(4, 9) });
  }
}
function paperFly() {
  const p = toScreen(1265, 620);
  for (let i = 0; i < 7; i++) parts.push({ k: 'paper', x: p.x, y: p.y, vx: rand(-260, 260), vy: rand(-620, -320), life: 2.2, max: 2.2, rot: rand(0, 6), vr: rand(-6, 6), size: rand(22, 34) });
}
function drawFx(dt) {
  g2.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => (p.life -= dt) > 0);
  for (const p of parts) {
    const k = p.life / p.max;
    if (p.k === 'paper') { p.vy += 900 * dt; p.vx *= 0.99; p.rot += p.vr * dt; }
    else if (p.k === 'star') { p.vx *= 0.9; p.vy *= 0.9; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    g2.save(); g2.translate(p.x, p.y); g2.globalAlpha = Math.min(1, k * 1.6);
    if (p.k === 'word') {
      g2.rotate(p.rot); const sc = 1 + (1 - k) * 0.35; g2.scale(sc, sc);
      g2.font = `800 ${p.size}px "Baloo 2", sans-serif`; g2.textAlign = 'center'; g2.lineJoin = 'round';
      g2.lineWidth = 8; g2.strokeStyle = '#1d2338'; g2.strokeText(p.txt, 0, 0); g2.fillStyle = '#f2c14e'; g2.fillText(p.txt, 0, 0);
    } else if (p.k === 'star') {
      g2.fillStyle = '#fff3c4'; g2.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? p.size * 0.4 : p.size, a = i * Math.PI / 4; g2.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g2.fill();
    } else if (p.k === 'paper') {
      g2.rotate(p.rot); g2.fillStyle = '#fbf8f1'; g2.fillRect(-p.size / 2, -p.size * 0.65, p.size, p.size * 1.3);
      g2.fillStyle = '#c9cede'; for (let i = 0; i < 4; i++) g2.fillRect(-p.size * 0.35, -p.size * 0.45 + i * p.size * 0.25, p.size * 0.7, 2);
    }
    g2.restore();
  }
}

/* ------------------------------------------------------------------ bulle, Zzz, rêve */
let bubbleT = 0;
function say(text, ms = 1500) {
  const b = $('#bubble'), c = headCenter(), p = toScreen(c.x + 30, c.y - HEAD_R - 34);
  b.textContent = text; b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
  b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(bubbleT); bubbleT = setTimeout(() => { b.hidden = true; }, ms);
}
let zzT = 0;
function spawnZ() {
  const c = headCenter(), t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', c.x + 70); t.setAttribute('y', c.y - 80); t.setAttribute('class', 'zz'); t.textContent = Math.random() < 0.5 ? 'Z' : 'z';
  $('#zzz').appendChild(t); setTimeout(() => t.remove(), 2700);
}
let dreamI = 0, dreamT = 0;

/* ------------------------------------------------------------------ la gifle */
let pointer = { x: -300, y: -300, sx: 0, sy: 0, vx: 0, vy: 0, t: 0, inside: false };
const hand = $('#hand');
function onMove(e) {
  const now = performance.now() / 1000, p = toSvg(e.clientX, e.clientY);
  const dt = Math.max(0.008, now - pointer.t);
  // vitesse dans les unités de la scène (indépendante de la taille de l'écran), lissée
  const vx = (p.x - pointer.sx) / dt, vy = (p.y - pointer.sy) / dt;
  pointer.vx = pointer.vx * 0.35 + vx * 0.65; pointer.vy = pointer.vy * 0.35 + vy * 0.65;
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.sx = p.x; pointer.sy = p.y; pointer.t = now;
  const c = headCenter(), inside = Math.hypot(p.x - c.x, (p.y - c.y) * 0.9) < HEAD_R + 10;
  const speed = Math.hypot(pointer.vx, pointer.vy * 0.6);
  if (S.phase === 'play' && inside && speed > 850 && now - S.lastSlap > 0.28 && Math.abs(pointer.vx) > Math.abs(pointer.vy) * 0.5) {
    slap(Math.sign(pointer.vx) || 1, clamp((speed - 850) / 2600, 0.12, 1), e.clientX, e.clientY);
  }
  pointer.inside = inside;
}
addEventListener('pointermove', onMove);
addEventListener('pointerdown', e => { const p = toSvg(e.clientX, e.clientY); pointer.sx = p.x; pointer.sy = p.y; pointer.t = performance.now() / 1000; pointer.vx = pointer.vy = 0; });

function slap(dir, s, cx, cy) {
  const now = performance.now() / 1000;
  S.lastSlap = now;
  // trop de gifles d'affilée : il se protège avec le bras
  if (now < S.blockUntil) { blip(140, 0.12, 'sine', 0.2, 0.6); parts.push({ k: 'word', x: cx, y: cy, vx: 0, vy: -60, life: 0.6, max: 0.6, txt: 'BLOQUÉ', size: 30, rot: rand(-0.2, 0.2) }); return; }
  S.hits = S.hits.filter(h => now - h < 1.2); S.hits.push(now);
  if (S.hits.length >= 5) {
    S.hits = []; S.blockUntil = now + 1.6;
    $('#guard').classList.add('up'); setTimeout(() => $('#guard').classList.remove('up'), 1600);
    say(pick(['Hé ! Doucement !', 'Pas le visage !', 'Ça va, ça va !', 'Stop ! Pause !']), 1500); mumble();
    return;
  }
  S.slaps++; S.power += s;
  $('#slaps').textContent = S.slaps;
  S.angVel += dir * (260 + 820 * s);
  S.squashVel -= 6 + 10 * s;
  const side = dir > 0 ? 'L' : 'R';      // la main vient de la gauche → joue gauche (vue de face)
  S.red[side] = Math.min(0.95, S.red[side] + 0.22 + s * 0.4);
  if (s > 0.55) S.print[side] = Math.min(0.85, S.print[side] + 0.5);
  S.wake = Math.min(100, S.wake + (2.2 + 5.5 * s) * (1 - S.wake / 350));   // réglé par simulation : 10 à 45 s selon le rythme
  S.flashEyes = 0.35;
  slapSound(s);
  burst(cx, cy, s, dir);
  if (s > 0.45) { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }
  hand.animate([{ transform: hand.style.transform + ' scale(0.8)' }, { transform: hand.style.transform }], { duration: 160 });
  // le rêve éclate
  if (!S.dreamOut) { S.dreamOut = true; $('#dream').classList.add('pop'); blip(900, 0.08, 'sine', 0.06, 2); S.dreamBackAt = S.t + 3.5; }
  // incidents de bureau
  if (s > 0.7 && !S.mugSpilled && Math.random() < 0.55) spillMug();
  else if (s > 0.6 && !S.papersGone && Math.random() < 0.4) { S.papersGone = true; $('#papers').style.opacity = 0; paperFly(); }
  // il répond (pas à chaque fois)
  if (S.wake >= 100) return wakeUp();
  if (Math.random() < 0.7) { say(pick(LINES[stageOf(S.wake)])); if (stageOf(S.wake) !== 'groggy') mumble(); else blip(320, 0.15, 'triangle', 0.06, 1.4); }
}
function spillMug() {
  S.mugSpilled = true;
  $('#mugInner').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-100deg) translate(-10px, 10px)' }], { duration: 380, easing: 'cubic-bezier(.5,0,.8,1.4)', fill: 'forwards' });
  $('#steam').style.opacity = 0;
  $('#spill').animate([{ opacity: 0 }, { opacity: 0.95 }], { duration: 700, delay: 250, fill: 'forwards' });
  setTimeout(() => blip(500, 0.3, 'sine', 0.05, 0.4), 250);
}

/* ------------------------------------------------------------------ boucle */
const fmt = sec => { const m = 52 + Math.floor(sec / 60); return m >= 60 ? '08:00' : `07:${String(m).padStart(2, '0')}`; };
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt;
  const st = S.phase === 'won' ? 'awake' : stageOf(S.wake);

  if (S.phase === 'play') {
    // le temps de bureau : 1 s réelle = 10 s de lundi
    S.gameSec += dt * 10;
    $('#time').textContent = fmt(S.gameSec);
    $('#clock').classList.toggle('late', S.gameSec > 420);
    if (S.gameSec >= 480) lose();
    // il se rendort, de plus en plus vite
    if (performance.now() / 1000 - S.lastSlap > 0.15) S.wake = Math.max(0, S.wake - (3.2 + S.slaps * 0.02 + (S.wake > 70 ? 2 : 0)) * dt);
    // rechute : toutes les 9 s, s'il est à moitié réveillé, il replonge
    if (S.t > S.relapseAt) {
      S.relapseAt = S.t + 9;
      if (S.wake > 40) { S.wake -= 15; S.angVel -= 160; say(pick(['zzz… *replonge*', '…juste… une seconde…', '*ronfle très fort*']), 1600); blip(110, 0.5, 'sawtooth', 0.04, 0.7); }
    }
  }

  // tête : ressort amorti vers sa position de repos (affalée → droite)
  const rest = { deep: -16, light: -9, groggy: -4, awake: 0 }[st] + (st === 'deep' ? Math.sin(S.t * 1.9) * 1.6 : 0);
  S.angVel += (-(S.angle - rest) * 90 - S.angVel * 9) * dt;
  S.angle = clamp(S.angle + S.angVel * dt, -48, 48);
  S.squashVel += (-S.squash * 260 - S.squashVel * 14) * dt; S.squash += S.squashVel * dt;
  const sx = 1 + S.squash * 0.02, sy = 1 - S.squash * 0.012;
  head.setAttribute('transform', `translate(${PIVOT.x} ${PIVOT.y}) rotate(${S.angle.toFixed(2)}) translate(0 ${-NECK}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);

  // joues : la rougeur s'estompe lentement, l'empreinte encore plus lentement
  for (const k of ['L', 'R']) {
    S.red[k] = Math.max(0, S.red[k] - dt * 0.06); S.print[k] = Math.max(0, S.print[k] - dt * 0.025);
    $('#cheek' + k).setAttribute('opacity', S.red[k].toFixed(3)); $('#print' + k).setAttribute('opacity', S.print[k].toFixed(3));
  }
  // visage selon l'état
  S.flashEyes = Math.max(0, S.flashEyes - dt);
  const eyes = S.flashEyes > 0 || st === 'awake' ? 'open' : st === 'groggy' ? 'half' : 'closed';
  $('#eyesClosed').setAttribute('opacity', eyes === 'closed' ? 1 : 0);
  $('#eyesHalf').setAttribute('opacity', eyes === 'half' ? 1 : 0);
  $('#eyesOpen').setAttribute('opacity', eyes === 'open' ? 1 : 0);
  const browUp = st === 'light' ? -6 : st === 'groggy' ? -3 : st === 'awake' ? -10 : 0;
  $('#browL').setAttribute('transform', `translate(0 ${browUp})`); $('#browR').setAttribute('transform', `translate(0 ${browUp})`);
  const m = $('#mouth');
  if (st === 'awake') { m.setAttribute('rx', 12); m.setAttribute('ry', 14); }
  else if (st === 'groggy') { m.setAttribute('rx', 16); m.setAttribute('ry', 6); }
  else { const o = st === 'deep' ? 14 + Math.sin(S.t * 1.9) * 4 : 9; m.setAttribute('rx', 14); m.setAttribute('ry', o); }
  $('#drool').setAttribute('opacity', st === 'deep' ? 0.85 : 0);

  // Zzz, rêve, ronflement, réveil
  if (S.phase !== 'won' && (st === 'deep' || st === 'light') && S.t - zzT > (st === 'deep' ? 1.4 : 2.6)) { zzT = S.t; spawnZ(); }
  if (S.dreamOut && S.t > S.dreamBackAt && st === 'deep' && S.phase !== 'won') { S.dreamOut = false; $('#dream').classList.remove('pop'); }
  if (S.t - dreamT > 2.4) { dreamT = S.t; dreamI = (dreamI + 1) % DREAMS.length; $('#dreamIcon').textContent = DREAMS[dreamI]; }
  if (ac) {
    const breath = Math.pow(Math.max(0, Math.sin(S.t * 1.9)), 2);
    const lvl = S.phase === 'won' ? 0 : st === 'deep' ? 0.2 : st === 'light' ? 0.07 : 0;
    snoreGain.gain.setTargetAtTime(lvl * breath, ac.currentTime, 0.05);
    const ringing = S.phase === 'play' && (S.t % 1.2) < 0.5 && (S.t % 0.125) < 0.07;
    alarmGain.gain.setTargetAtTime(ringing ? 0.018 : 0, ac.currentTime, 0.004);
  }

  // jauge
  $('#wake').style.width = S.wake.toFixed(1) + '%';
  $('#mood').textContent = st === 'awake' ? '😳' : st === 'groggy' ? '🥱' : st === 'light' ? '😪' : '😴';

  // main qui suit le pointeur, inclinée selon la vitesse
  const tilt = clamp(pointer.vx * 0.012, -40, 40);
  hand.style.transform = `translate(${pointer.x}px, ${pointer.y}px) rotate(${tilt}deg)`;

  drawFx(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ------------------------------------------------------------------ début, fin */
function setRinging(on) { $('#alarmInner').classList.toggle('ringing', on); $('#ring').classList.toggle('on', on); }
function start() {
  initAudio(); if (ac.state === 'suspended') ac.resume();
  Object.assign(S, { phase: 'play', wake: 0, slaps: 0, power: 0, gameSec: 0, lastSlap: -9, hits: [], blockUntil: 0, relapseAt: S.t + 9, dreamOut: false, mugSpilled: false, papersGone: false, angle: -16, angVel: 0, red: { L: 0, R: 0 }, print: { L: 0, R: 0 } });
  $('#slaps').textContent = 0; $('#time').textContent = '07:52';
  $('#mugInner').getAnimations().forEach(a => a.cancel()); $('#spill').getAnimations().forEach(a => a.cancel()); $('#steam').style.opacity = '';
  $('#papers').style.opacity = 1; $('#dream').classList.remove('pop'); $('#scrNote').textContent = 'Michel : en attente…';
  $('#panel').hidden = true; stage.classList.add('playing'); setRinging(true);
}
function stats() {
  const avg = S.slaps ? S.power / S.slaps : 0;
  const rank = avg > 0.78 ? 'Manager toxique 🔥' : S.mugSpilled && S.papersGone ? 'Tornade de bureau 🌪️' : S.slaps <= 18 ? 'Réveil-matin humain ⏰' : 'Collègue attentionné 🤝';
  return { avg: Math.round(avg * 100), rank };
}
function endPanel(html) {
  stage.classList.remove('playing'); setRinging(false);
  $('#panel').innerHTML = `<div class="card">${html}<button class="btn" id="again">Recommencer le lundi</button></div>`;
  $('#panel').hidden = false;
  $('#again').addEventListener('click', start);
}
function wakeUp() {
  S.phase = 'won'; S.angVel += 140;
  $('#scrNote').textContent = 'Michel : en route !';
  blip(523, 0.15, 'sine', 0.1); setTimeout(() => blip(784, 0.3, 'sine', 0.1), 140);
  setTimeout(() => say('…On est lundi ?', 2200), 300);
  const left = 8 - Math.floor(S.gameSec / 60), { avg, rank } = stats();
  setTimeout(() => endPanel(`
    <p class="kicker">${fmt(S.gameSec)} · Réveillé</p>
    <h1>Michel est réveillé.</h1>
    <p>Il arrive à la réunion avec ${left > 0 ? `${left} minute${left > 1 ? 's' : ''} d'avance` : 'pile à l\'heure'} et une joue ${S.red.L + S.red.R > 1.2 ? 'très ' : ''}rouge.</p>
    <div class="stats"><div><b>${S.slaps}</b>gifles</div><div><b>${avg} %</b>puissance moy.</div><div><b>${S.mugSpilled ? 'oui' : 'non'}</b>café renversé</div></div>
    <p>Ton titre : <span class="rank">${rank}</span></p>
    <p style="font-size:13px;color:#5b6078">Michel ne se souviendra de rien.</p>`), 2400);
}
function lose() {
  S.phase = 'lost';
  $('#time').textContent = '08:00'; $('#scrNote').textContent = 'Michel : absent';
  say('zzz… réunion… zzz', 2600);
  const { avg } = stats();
  setTimeout(() => endPanel(`
    <p class="kicker">08:00 · Raté</p>
    <h1>Michel a raté la réunion.</h1>
    <p>Le point hebdo s'est très bien passé sans lui. C'est peut-être lui qui a raison.</p>
    <div class="stats"><div><b>${S.slaps}</b>gifles</div><div><b>${Math.round(S.wake)} %</b>d'éveil</div><div><b>${avg} %</b>puissance moy.</div></div>
    <p style="font-size:13px;color:#5b6078">Astuce : des gifles rapides et régulières. Il s'habitue vite.</p>`), 1800);
}
$('#start').addEventListener('click', start);

window.michel = S;   // pour déboguer depuis la console
