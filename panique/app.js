/*
 * Lundi, 9 h 02 — 1 min 30 pour répondre à tout ce qui tombe sur un poste de dev.
 * Bonne réponse +1, mauvaise réponse ou notification ignorée −1. Le rythme accélère jusqu'au chaos.
 * Les scores sont gardés dans ce navigateur (localStorage), avec le pseudo demandé à la fin.
 */
import { PEOPLE, TEMPLATES } from './data.js';

const $ = (s, el = document) => el.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, k) => a + (b - a) * k;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

const DURATION = 90;
const stage = $('#stage');

/* ------------------------------------------------------------------ la scène s'adapte à la fenêtre */
let scale = 1;
function fit() { scale = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `translate(-50%, -50%) scale(${scale})`; }
addEventListener('resize', fit); fit();

/* ------------------------------------------------------------------ décor vivant : code, terminal, horloges */
const CODE = [
  ['cm', '// Export CSV des clients — utilisé par le portail (NE PAS TOUCHER sans prévenir Julie)'],
  ['', '<span class="c">import</span> <span class="p">{</span> <span class="v">db</span> <span class="p">}</span> <span class="c">from</span> <span class="s">\'../db\'</span><span class="p">;</span>'],
  ['', '<span class="c">import</span> <span class="k">type</span> <span class="p">{</span> <span class="t">Client</span><span class="p">,</span> <span class="t">ExportOptions</span> <span class="p">}</span> <span class="c">from</span> <span class="s">\'./types\'</span><span class="p">;</span>'],
  ['', ''],
  ['', '<span class="k">const</span> <span class="v">MAX_ROWS</span> <span class="p">=</span> <span class="nu">50_000</span><span class="p">;</span>'],
  ['', ''],
  ['', '<span class="c">export</span> <span class="k">async</span> <span class="k">function</span> <span class="f">getClientExport</span><span class="y">(</span><span class="v">opts</span><span class="p">:</span> <span class="t">ExportOptions</span><span class="y">)</span><span class="p">:</span> <span class="t">Promise</span><span class="p">&lt;</span><span class="t">string</span><span class="p">&gt;</span> <span class="y">{</span>'],
  ['', '  <span class="k">const</span> <span class="v">clients</span><span class="p">:</span> <span class="t">Client</span><span class="p">[]</span> <span class="p">=</span> <span class="c">await</span> <span class="v">db</span><span class="p">.</span><span class="f">query</span><span class="y">(</span><span class="s">\'SELECT * FROM clients WHERE active = 1\'</span><span class="y">)</span><span class="p">;</span>'],
  ['', '  <span class="c">if</span> <span class="y">(</span><span class="p">!</span><span class="v">clients</span><span class="p">.</span><span class="v">length</span><span class="y">)</span> <span class="c">return</span> <span class="s">\'\'</span><span class="p">;</span> <span class="cm">// TODO: pourquoi c\'est vide ce matin ?</span>'],
  ['', ''],
  ['', '  <span class="k">const</span> <span class="v">rows</span> <span class="p">=</span> <span class="v">clients</span><span class="p">.</span><span class="f">slice</span><span class="y">(</span><span class="nu">0</span><span class="p">,</span> <span class="v">MAX_ROWS</span><span class="y">)</span><span class="p">.</span><span class="f">map</span><span class="y">(</span><span class="y">(</span><span class="v">c</span><span class="y">)</span> <span class="k">=&gt;</span> <span class="y">[</span>'],
  ['', '    <span class="v">c</span><span class="p">.</span><span class="v">id</span><span class="p">,</span> <span class="v">c</span><span class="p">.</span><span class="v">name</span><span class="p">,</span> <span class="v">c</span><span class="p">.</span><span class="v">email</span><span class="p">,</span> <span class="v">c</span><span class="p">.</span><span class="err"><span class="v">creatdAt</span></span><span class="p">.</span><span class="f">toISOString</span><span class="y">()</span><span class="p">,</span>'],
  ['', '  <span class="y">])</span><span class="p">;</span>'],
  ['cur', '  <span class="c">return</span> <span class="f">toCsv</span><span class="y">(</span><span class="v">rows</span><span class="p">,</span> <span class="v">opts</span><span class="p">.</span><span class="v">separator</span> <span class="p">??</span> <span class="s">\';\'</span><span class="y">)</span><span class="p">;</span><span class="caret"></span>'],
  ['', '<span class="y">}</span>'],
  ['', ''],
  ['', '<span class="cm">/** @deprecated — utilisé encore en prod, personne ne sait où */</span>'],
  ['', '<span class="c">export</span> <span class="k">function</span> <span class="f">legacyExport</span><span class="y">(</span><span class="y">)</span> <span class="y">{</span>'],
  ['', '  <span class="c">return</span> <span class="f">getClientExport</span><span class="y">(</span><span class="y">{</span> <span class="v">separator</span><span class="p">:</span> <span class="s">\',\'</span> <span class="y">}</span> <span class="k">as</span> <span class="k">any</span><span class="y">)</span><span class="p">;</span>'],
  ['', '<span class="y">}</span>'],
];
$('#code').innerHTML = CODE.map(([cls, html], i) => `<div class="ln ${cls === 'cur' ? 'cur' : ''}"><span class="n">${i + 31}</span><span class="cd">${cls === 'cm' ? `<span class="cm">${html}</span>` : html}</span></div>`).join('');

const TERM_OK = [['g', '[nodemon] restarting due to changes...'], ['b', 'GET /api/clients 200 12ms'], ['', 'GET /api/health 200 2ms'], ['g', '✓ compiled in 412ms']];
const TERM_BAD = [['r', 'Error: connect ECONNREFUSED 10.0.3.12:5432'], ['r', 'GET /api/clients/export 500 3012ms'], ['yl', 'warn: retry 3/5 on payments-service'], ['r', 'TypeError: Cannot read properties of undefined (reading \'toISOString\')'], ['r', 'FATAL: remaining connection slots are reserved'], ['yl', '(node:4412) MaxListenersExceededWarning: possible memory leak'], ['r', 'UnhandledPromiseRejection: timeout after 30000ms']];
function termLine(bad) {
  const [c, t] = bad ? pick(TERM_BAD) : pick(TERM_OK), d = document.createElement('div');
  d.innerHTML = `<span class="${c}">${esc(t)}</span>`; $('#term').appendChild(d);
  while ($('#term').children.length > 6) $('#term').firstChild.remove();
}
for (let i = 0; i < 5; i++) termLine(false);

const feedHistory = [
  { who: 'bot', where: '#deploys', time: '08:41', text: '✅ v2.13.9 déployée en prod (par Karim).' },
  { who: 'julie', where: '#produit', time: '08:55', text: 'Bonjour à tous ☀️ le client Durand a une démo à 11h, on évite de tout casser ce matin svp 🙏' },
];
function slackMsg({ who, where, time, text }) {
  const p = PEOPLE[who], d = document.createElement('div');
  d.className = 'sm';
  d.innerHTML = `<div class="av" style="background:${p.color}">${p.initials}</div><div class="bd"><div class="meta"><b>${p.name}</b>${p.role === 'APP' ? '<span class="app">APP</span>' : ''}<small>${time}</small><span class="where">${where}</span></div><div class="txt">${md(text)}</div></div>`;
  return d;
}
feedHistory.forEach(m => $('#feed').appendChild(slackMsg(m)));

/* ------------------------------------------------------------------ son (synthétisé, volume modéré) */
let ac = null, master = null, muted = false;
function audio() { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination); } return ac; }
function tone(f, d = 0.12, type = 'sine', v = 0.12, at = 0, slide = 1) {
  if (!ac || muted) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
}
const SFX = {
  code: () => tone(1200, 0.06, 'sine', 0.05),
  slack: () => { tone(740, 0.09, 'sine', 0.12); tone(988, 0.12, 'sine', 0.1, 0.07); },
  toast: () => tone(1318, 0.25, 'sine', 0.09),
  call: () => { tone(660, 0.18, 'triangle', 0.09); tone(880, 0.22, 'triangle', 0.09, 0.2); },
  alert: () => { for (let i = 0; i < 3; i++) { tone(760, 0.18, 'square', 0.05, i * 0.36); tone(1020, 0.18, 'square', 0.05, i * 0.36 + 0.18); } },
  phone: () => { tone(150, 0.35, 'sawtooth', 0.06); tone(150, 0.35, 'sawtooth', 0.06, 0.45); },
  ok: () => { tone(880, 0.08, 'sine', 0.08); tone(1320, 0.1, 'sine', 0.07, 0.06); },
  ko: () => tone(180, 0.25, 'sawtooth', 0.07, 0, 0.6),
};
$('#mute').addEventListener('click', () => { muted = !muted; $('#mute').textContent = muted ? '🔇' : '🔊'; });

/* ------------------------------------------------------------------ état de la partie */
const CAP = { code: 3, slack: 4, toast: 3, alert: 2, phone: 4 };
const TTL = { code: 8, slack: 8.5, toast: 7.5, alert: 7, phone: 8 };
let S = null, nid = 0, bag = [];
function freshState() { return { running: false, t: 0, score: 0, ok: 0, bad: 0, miss: 0, active: [], nextSpawn: 0.8, nextTerm: 1, clockMin: 2, batt: 23, unread: {}, gitN: 3, errN: 3, warnN: 12, mail: 2 }; }

function drawTemplate() {
  if (!bag.length) bag = TEMPLATES.map((_, i) => i).sort(() => Math.random() - 0.5);
  // on évite qu'une surface déjà pleine reçoive tout : on cherche un modèle dont la surface a de la place
  for (let k = 0; k < bag.length; k++) {
    const tpl = TEMPLATES[bag[k]];
    if (S.active.filter(n => n.surf === tpl.surf).length < CAP[tpl.surf]) { bag.splice(k, 1); return tpl; }
  }
  return TEMPLATES[bag.pop()];   // tout est plein : tant pis, le plus ancien sautera
}

/* ------------------------------------------------------------------ rendu de chaque type de notification */
const ICONS = {
  outlook: ['#0f6cbd', 'O'], teams: ['#5b5fc7', 'T'], jira: ['#0052cc', 'J'], windows: ['#0067c0', '⊞'],
  sms: ['#34c759', '💬'], auth: ['#1a73e8', '🔐'], food: ['#06c167', '🍜'], battery: ['#ff3b30', '🔋'], whatsapp: ['#25d366', '✆'], cal: ['#ffffff', '📅'], call: ['#34c759', '📞'],
};
const shuffled = acts => acts.map(a => a).sort(() => Math.random() - 0.5);
function buttons(n, cls = '') { return n.acts.map((a, i) => `<button type="button" data-i="${i}" class="${cls && i === 0 ? cls : ''}">${esc(a[0])}</button>`).join(''); }
const hhmm = () => `09:${String(S.clockMin).padStart(2, '0')}`;

function render(n) {
  const tpl = n.tpl, el = document.createElement('div');
  if (n.surf === 'code') {
    el.className = 'vt';
    el.innerHTML = `<div class="row"><span class="ic ${tpl.level}">${tpl.level === 'error' ? '✕' : tpl.level === 'warn' ? '!' : 'i'}</span><div>${md(tpl.text)}</div></div><div class="src">Source : ${tpl.level === 'info' ? 'Visual Studio Code' : 'TypeScript, Git'}</div><div class="acts">${buttons(n, 'pri')}</div><i class="ttl"></i>`;
    $('#codeToasts').appendChild(el);
    $('.vc-status .bell').classList.remove('ring'); void el.offsetWidth; $('.vc-status .bell').classList.add('ring');
  } else if (n.surf === 'slack') {
    const p = PEOPLE[tpl.who];
    el.className = 'sm live';
    el.innerHTML = `<div class="av" style="background:${p.color}">${p.initials}</div><div class="bd"><div class="meta"><b>${p.name}</b>${p.role === 'APP' ? '<span class="app">APP</span>' : ''}<small>${hhmm()}</small><span class="where">${tpl.where}</span></div><div class="txt">${md(tpl.text)}</div><div class="acts">${buttons(n)}</div></div><i class="ttl"></i>`;
    $('#feed').appendChild(el);
    const feed = $('#feed'); while (feed.children.length > 9) { const old = [...feed.children].find(c => !c.classList.contains('live')); if (!old) break; old.remove(); }
    bumpUnread(tpl.where === 'Message direct' ? tpl.who : tpl.where);
  } else if (n.surf === 'toast') {
    const [bg, ch] = ICONS[tpl.icon];
    el.className = 'wt' + (tpl.call ? ' call ringing' : '');
    el.innerHTML = `<div class="hd"><i style="background:${bg}">${ch}</i>${tpl.app}<span class="x">✕</span></div><div class="ti">${esc(tpl.title)}</div><div class="tx">${md(tpl.text)}</div><div class="acts">${buttons(n)}</div><i class="ttl"></i>`;
    $('#toasts').appendChild(el);
    if (tpl.app === 'Outlook') { S.mail++; $('#tbMail').textContent = S.mail; }
  } else if (n.surf === 'alert') {
    el.className = 'al' + (tpl.sev === 'high' ? ' high' : '');
    el.innerHTML = `<div class="bdy"><div class="lb">ASTREINTE · ${tpl.sev === 'high' ? 'PRIORITÉ HAUTE' : 'CRITIQUE'}</div><div class="ti">${esc(tpl.title)}</div><div class="tx">${esc(tpl.text)}</div></div><div class="acts">${buttons(n)}</div><i class="ttl"></i>`;
    $('#alerts').appendChild(el);
    shake();
  } else if (n.surf === 'phone') {
    const [bg, ch] = ICONS[tpl.icon];
    el.className = 'pn';
    el.innerHTML = `<div class="hd"><i style="background:${bg}">${ch}</i>${tpl.app}<small>maintenant</small></div><div class="ti">${esc(tpl.title)}</div><div class="tx">${md(tpl.text)}</div><div class="acts">${buttons(n)}</div><i class="ttl"></i>`;
    $('#phNotifs').prepend(el);
    $('#phone').classList.remove('buzz'); void $('#phone').offsetWidth; $('#phone').classList.add('buzz');
  }
  el.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b || n.done) return;
    resolve(n, n.acts[+b.dataset.i][1] ? 'ok' : 'ko', b.textContent);
  });
  return el;
}

function bumpUnread(key) {
  S.unread[key] = (S.unread[key] || 0) + 1;
  const ch = document.querySelector(`.sl-side .ch[data-ch="${key}"]`);
  if (ch) { ch.classList.add('unread'); $('b', ch).textContent = S.unread[key]; }
  const tot = Object.values(S.unread).reduce((a, b) => a + b, 0);
  $('#actBadge').hidden = false; $('#actBadge').textContent = tot > 99 ? '99+' : tot;
  $('#tbSlack').hidden = false; $('#tbSlack').textContent = tot > 99 ? '99+' : tot;
}

function spawn() {
  const tpl = drawTemplate();
  // surface pleine : la plus ancienne notification de cette surface est perdue
  const same = S.active.filter(n => n.surf === tpl.surf);
  if (same.length >= CAP[tpl.surf]) resolve(same[0], 'miss');
  const p = S.t / DURATION;
  const life = TTL[tpl.surf] * lerp(1, 0.55, p) * (tpl.call ? 0.85 : 1);
  const n = { id: ++nid, tpl, surf: tpl.surf, born: S.t, life, acts: shuffled(tpl.actions), done: false };
  n.el = render(n);
  S.active.push(n);
  (tpl.call ? SFX.call : SFX[tpl.surf])();
  if (tpl.surf === 'alert') $('#redlight').classList.add('on');
}

/** Bonne réponse, mauvaise réponse ou temps écoulé. */
function resolve(n, how, label = '') {
  if (n.done) return;
  n.done = true;
  S.active = S.active.filter(x => x !== n);
  const r = n.el.getBoundingClientRect(), st = stage.getBoundingClientRect();
  floater((r.left + r.width / 2 - st.left) / scale, (r.top + r.height / 2 - st.top) / scale, how === 'ok' ? '+1' : '−1', how === 'ok' ? 'ok' : 'ko');
  if (how === 'ok') { S.score++; S.ok++; SFX.ok(); }
  else {
    S.score--; how === 'ko' ? S.bad++ : S.miss++; SFX.ko();
    S.errN++; S.warnN += 2; $('#errStat').textContent = `⊗ ${S.errN} ⚠ ${S.warnN}`; $('#probCount').textContent = S.errN;
  }
  updateHud();
  if (n.surf === 'slack') {
    n.el.classList.remove('live');
    $('.acts', n.el).outerHTML = how === 'miss' ? '<div class="done ko">⏱ Sans réponse</div>' : `<div class="done ${how}">${how === 'ok' ? '✓' : '✗'} Vous avez répondu : « ${esc(label)} »</div>`;
    $('.ttl', n.el)?.remove();
  } else {
    n.el.classList.add(how === 'ok' ? 'gone-ok' : 'gone-ko');
    setTimeout(() => n.el.remove(), 450);
  }
  if (!S.active.some(x => x.surf === 'alert')) $('#redlight').classList.remove('on');
}

function floater(x, y, txt, cls) {
  const f = document.createElement('div'); f.className = 'fl ' + cls; f.textContent = txt;
  f.style.left = x + 'px'; f.style.top = y + 'px'; $('#floaters').appendChild(f);
  setTimeout(() => f.remove(), 1000);
}
function shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

function updateHud() {
  const sc = $('#score'); sc.textContent = S.score; sc.className = S.score < 0 ? 'neg' : S.score > 0 ? 'pos' : '';
  $('#okN').textContent = S.ok; $('#badN').textContent = S.bad; $('#missN').textContent = S.miss;
}

/* ------------------------------------------------------------------ boucle */
let last = 0;
function loop(now) {
  if (!S.running) return;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  S.t += dt;
  const p = Math.min(1, S.t / DURATION);
  // temps restant
  const left = Math.max(0, DURATION - S.t);
  $('#time').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  $('#timeBar').style.width = (left / DURATION * 100) + '%';
  $('.h-time').classList.toggle('hurry', left < 15);
  // barres de vie des notifications, expirations
  for (const n of [...S.active]) {
    const k = (S.t - n.born) / n.life;
    const bar = n.el.querySelector('.ttl'); if (bar) bar.style.transform = `scaleX(${Math.max(0, 1 - k)})`;
    n.el.classList.toggle('late', k > 0.7);
    if (k >= 1) resolve(n, 'miss');
  }
  // arrivées de plus en plus rapprochées
  if (S.t >= S.nextSpawn && left > 0.6) {
    spawn();
    if (p > 0.55 && Math.random() < p * 0.45) spawn();   // vers la fin, ça tombe par deux
    S.nextSpawn = S.t + lerp(2.6, 0.42, Math.pow(p, 1.3)) * rand(0.75, 1.2);
  }
  // le décor s'affole
  if (S.t >= S.nextTerm) { termLine(Math.random() < 0.25 + p * 0.7); S.nextTerm = S.t + lerp(1.6, 0.25, p); if (Math.random() < p * 0.3) { S.gitN++; $('#gitBadge').textContent = S.gitN; } }
  const mins = 2 + Math.floor(S.t / 1.6); if (mins !== S.clockMin) { S.clockMin = Math.min(59, mins); $('#clock').textContent = hhmm(); $('#phClock').textContent = hhmm(); $('#phTime').textContent = '9:' + String(S.clockMin).padStart(2, '0'); }
  const batt = Math.max(1, Math.round(23 - p * 21)); if (batt !== S.batt) { S.batt = batt; $('#batt').textContent = batt; }
  if (left <= 0) return end();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ début et fin */
function clearBoard() {
  ['#codeToasts', '#toasts', '#alerts', '#phNotifs'].forEach(s => { $(s).innerHTML = ''; });
  [...$('#feed').querySelectorAll('.sm.live, .sm .done')].forEach(e => e.closest('.sm')?.remove());
  document.querySelectorAll('.sl-side .ch').forEach(c => { c.classList.remove('unread'); $('b', c).textContent = ''; });
  $('#actBadge').hidden = $('#tbSlack').hidden = true; $('#tbMail').textContent = 2;
  $('#redlight').classList.remove('on'); $('#gitBadge').textContent = 3; $('#errStat').textContent = '⊗ 3 ⚠ 12'; $('#probCount').textContent = 3;
}
function start() {
  audio(); if (ac.state === 'suspended') ac.resume();
  S = freshState(); bag = []; clearBoard(); updateHud();
  $('#intro').hidden = true; $('#end').hidden = true; $('#hud').hidden = false;
  S.running = true; last = performance.now(); requestAnimationFrame(loop);
}

const RANKS = [[-15, '🔥 Lettre de démission rédigée'], [0, '😵 Submergé par les notifications'], [10, '😐 Survivant du lundi'], [25, '💪 Dev aguerri'], [40, '🧘 SRE zen'], [Infinity, '🦸 10x engineer (ou menteur)']];
const rankOf = s => RANKS.find(([max]) => s < max)[1];
const KEY = 'panique.scores.v1';
const loadScores = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const saveScores = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* stockage indisponible */ } };

function end() {
  S.running = false;
  document.querySelectorAll('.vt button, .wt button, .al button, .pn button, .sm.live button').forEach(b => { b.disabled = true; });
  $('#redlight').classList.remove('on');
  setTimeout(() => {
    const s = S.score;
    $('#endCard').innerHTML = `
      <div>
        <p class="kicker">10 h 02 · Fin de la matinée</p>
        <div class="big-score ${s < 0 ? 'neg' : s > 0 ? 'pos' : ''}">${s > 0 ? '+' : ''}${s}</div>
        <div class="rank">${rankOf(s)}</div>
        <div class="end-stats"><div><b>${S.ok}</b>bonnes réponses</div><div><b>${S.bad}</b>mauvaises</div><div><b>${S.miss}</b>ignorées</div></div>
        <form class="save" id="saveForm"><input id="pseudo" maxlength="18" placeholder="Ton pseudo" autocomplete="nickname" required /><button class="btn" type="submit">Enregistrer</button></form>
        <p class="small">Les scores sont gardés dans ce navigateur.</p>
        <button class="btn red" id="again" type="button" style="margin-top:6px">Rejouer le lundi</button>
      </div>
      <div><h2>🏆 Classement</h2><ol class="board" id="board"></ol></div>`;
    $('#end').hidden = false;
    $('#pseudo').value = localStorage.getItem('panique.pseudo') || '';
    $('#pseudo').focus();
    renderBoard();
    $('#saveForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#pseudo').value.trim().slice(0, 18) || 'Anonyme';
      localStorage.setItem('panique.pseudo', name);
      const list = loadScores(); const entry = { name, score: s, ok: S.ok, bad: S.bad, miss: S.miss, at: Date.now() };
      list.push(entry); list.sort((a, b) => b.score - a.score || a.at - b.at); saveScores(list.slice(0, 50));
      $('#saveForm').outerHTML = `<p style="font-weight:700;color:#16a34a">✓ Score enregistré pour ${esc(name)}</p>`;
      renderBoard(entry.at);
    });
    $('#again').addEventListener('click', start);
  }, 900);
}
function renderBoard(mine) {
  const list = loadScores().slice(0, 10);
  $('#board').innerHTML = list.length ? list.map(e => `<li class="${e.at === mine ? 'me' : ''}"><span>${esc(e.name)}</span><b class="${e.score < 0 ? 'neg' : ''}">${e.score > 0 ? '+' : ''}${e.score}</b></li>`).join('') : '<li class="empty">Aucun score pour l\'instant. Sois le premier.</li>';
}

$('#start').addEventListener('click', start);
window.panique = { get state() { return S; }, spawn: () => S && spawn() };   // pour déboguer
