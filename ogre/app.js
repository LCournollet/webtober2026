/*
 * tanières — fan-parodie d'annonce de location : la souche du marais et ses toilettes.
 * Aucune donnée n'est envoyée : tout se passe dans la page.
 */
import { stump, outhouse, bedroom, spa, view, ogreFace, map, door, ogreOut } from './art.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const euro = n => n.toLocaleString('fr-FR') + ' €';

/* ------------------------------------------------------------------ photos */
const PHOTOS = [
  { art: stump, cap: 'La souche, au petit matin. Toilettes au fond du jardin, à droite.' },
  { art: outhouse, cap: 'Les toilettes. Porte qui ferme presque. Papier : contes de fées.' },
  { art: bedroom, cap: 'La chambre : lit de feuilles, broderie « Home Sweet Boue ».' },
  { art: spa, cap: 'Le spa privatif : bain de boue tiède, grenouille incluse.' },
  { art: view, cap: 'La vue, à la tombée de la nuit. Lucioles fournies.' },
];
$$('#gallery .ph').forEach((b, i) => { b.innerHTML = PHOTOS[i].art('g' + i); b.setAttribute('aria-label', PHOTOS[i].cap); b.addEventListener('click', () => lightbox(i)); });
$('#allPhotos').addEventListener('click', () => lightbox(0));
$('#hostAvatar').innerHTML = ogreFace('h1');
$('#hostAvatar2').innerHTML = ogreFace('h2');
$('#sleepImg').innerHTML = bedroom('s1');
$('#toiletsImg').innerHTML = outhouse('t1');
$('#map').innerHTML = map('m1');

/* ------------------------------------------------------------------ petits outils d'interface */
let toastT = 0;
function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
document.addEventListener('click', e => { const el = e.target.closest('[data-toast]'); if (el) { e.preventDefault(); toast(el.dataset.toast); } });

const modal = $('#modal'), mBody = $('.modal-body', modal);
let onClose = null;
function open(html, { wide = false, dark = false, closeCb = null } = {}) {
  mBody.innerHTML = html;
  modal.classList.toggle('wide', wide); modal.classList.toggle('dark', dark);
  modal.hidden = false; document.body.style.overflow = 'hidden';
  onClose = closeCb;
}
function close() { modal.hidden = true; document.body.style.overflow = ''; mBody.innerHTML = ''; onClose?.(); onClose = null; }
$('.x', modal).addEventListener('click', close);
modal.addEventListener('click', e => { if (e.target === modal) close(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });

/* ------------------------------------------------------------------ son (synthétisé) */
let ac = null;
const audio = () => (ac ??= new (window.AudioContext || window.webkitAudioContext)());
function thud(f = 120, v = 0.35) {
  const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.12);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.2);
}
function knock() { thud(150); setTimeout(() => thud(140), 160); }
function roar(dur = 1.4) {
  const a = audio(), t = a.currentTime;
  const o = a.createOscillator(), o2 = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain();
  o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(70, t + dur); o2.frequency.setValueAtTime(48, t);
  lfo.frequency.value = 23; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency);
  const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(420, t + dur); f1.Q.value = 2.5;
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.34, t + 0.08); g.gain.setValueAtTime(0.3, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // souffle
  const n = a.createBufferSource(), buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = buf; const nf = a.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.8; const ng = a.createGain(); ng.gain.value = 0.25;
  o.connect(f1); o2.connect(f1); f1.connect(g); n.connect(nf); nf.connect(ng); ng.connect(g); g.connect(a.destination);
  [o, o2, lfo, n].forEach(x => { x.start(t); x.stop(t + dur + 0.05); });
}
function plop() { const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.08); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.14); }

/* ------------------------------------------------------------------ galerie plein écran */
function lightbox(i) {
  const render = () => {
    mBody.innerHTML = `<div class="lb"><div class="frame">${PHOTOS[i].art('lb' + i)}</div>
      <div class="cap"><span>${i + 1} / ${PHOTOS.length} · ${PHOTOS[i].cap}</span><span class="nav-b"><button type="button" data-d="-1" aria-label="Précédente">‹</button><button type="button" data-d="1" aria-label="Suivante">›</button></span></div></div>`;
    $$('.nav-b button', mBody).forEach(b => b.addEventListener('click', () => { i = (i + +b.dataset.d + PHOTOS.length) % PHOTOS.length; render(); }));
  };
  open('', { wide: true, dark: true, closeCb: () => removeEventListener('keydown', keys) });
  const keys = e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { i = (i + (e.key === 'ArrowRight' ? 1 : -1) + PHOTOS.length) % PHOTOS.length; render(); } };
  addEventListener('keydown', keys);
  render();
}

/* ------------------------------------------------------------------ titre : partager, enregistrer, lire la suite */
$('#share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Lien copié. Ne le partagez pas avec des chevaliers.'); }
  catch { toast('Copie impossible. L\'hôte préfère, de toute façon.'); }
});
$('#save').addEventListener('click', e => {
  const b = e.currentTarget; b.classList.toggle('on');
  $('span', b).textContent = b.classList.contains('on') ? 'Enregistré' : 'Enregistrer';
  toast(b.classList.contains('on') ? 'Ajouté à vos favoris. L\'hôte n\'aime pas qu\'on l\'aime.' : 'Retiré des favoris. L\'hôte est soulagé.');
});
$('#readMore').addEventListener('click', e => { $('.desc .more').hidden = false; e.currentTarget.remove(); });
$('#searchBtn').addEventListener('click', () => toast('Il n\'y a qu\'un seul logement dans le marais. Vous êtes dessus.'));

/* ------------------------------------------------------------------ équipements */
const AMEN = [
  ['Salle de bain', [['🚽', 'Toilettes sèches d\'époque (privées, très privées)'], ['🛁', 'Spa : bain de boue tiède'], ['📜', 'Papier fourni : pages de contes de fées assortis'], ['🪥', 'Brosse à dents (à l\'hôte, n\'y touchez pas)']]],
  ['Chambre et linge', [['🍂', 'Lit de feuilles double (si on se serre)'], ['🧺', 'Couverture en patchwork de sacs'], ['🕯️', 'Éclairage à la bougie (cire d\'oreille non incluse)']]],
  ['Vue et extérieur', [['🌫️', 'Vue imprenable sur la boue'], ['🐸', 'Grenouilles, rats, lucioles — et un âne, parfois'], ['🪧', '6 panneaux « Défense d\'entrer »'], ['🔥', 'Feu de camp']]],
  ['Cuisine', [['🧅', 'Cuisine équipée, oignons à volonté'], ['🍲', 'Chaudron (ne pas demander ce qu\'il y a dedans)'], ['🐀', 'Brochettes de rat (sur demande)']]],
  ['Internet et bureau', [['📶', 'Wi-Fi — non. Wi-Feu — oui'], ['🪶', 'Espace de travail : une souche']]],
  ['Sécurité', [['🚨', 'Détecteur de fumée : l\'hôte'], ['🐉', 'Système anti-intrusion naturel']]],
  ['Non inclus', [['❌', 'Chauffage central', 1], ['❌', 'Voisins', 1], ['❌', 'Princesse (déjà prise)', 1], ['❌', 'Miroir (cassé)', 1], ['❌', 'Papier toilette standard', 1]]],
];
const TOP = [AMEN[0][1][0], AMEN[2][1][0], AMEN[2][1][1], AMEN[0][1][1], AMEN[3][1][0], AMEN[4][1][0], AMEN[0][1][2], AMEN[2][1][2], AMEN[6][1][0], AMEN[6][1][2]];
$('#amen').innerHTML = TOP.map(([i, t, no]) => `<li class="${no ? 'no' : ''}"><span>${i}</span>${t}</li>`).join('');
$('#allAmen').addEventListener('click', () => open(`<h3>Ce que propose ce logement</h3><ul class="amen-all">${AMEN.map(([g, items]) => `<h4>${g}</h4>${items.map(([i, t, no]) => `<li class="${no ? 'no' : ''}"><span>${i}</span>${t}</li>`).join('')}`).join('')}</ul>`));

/* ------------------------------------------------------------------ calendrier et prix */
const NIGHTLY = 49;
const today = new Date(); today.setHours(0, 0, 0, 0);
const months = [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;   // date locale (pas UTC)
const blocked = d => d < today || d.getDay() === 3 || [13, 14, 27].includes(d.getDate());   // les mercredis : jour de bain de boue
let start = null, end = null;
function renderCal() {
  $('#cal').innerHTML = months.map(m => {
    const first = (m.getDay() + 6) % 7, n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    let cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<span class="dow">${d}</span>`).join('') + '<span></span>'.repeat(first);
    for (let i = 1; i <= n; i++) {
      const d = new Date(m.getFullYear(), m.getMonth(), i), k = key(d);
      const sel = (start && k === key(start)) || (end && k === key(end));
      const inR = start && end && d > start && d < end;
      cells += `<button type="button" class="day ${sel ? 'sel' : ''} ${inR ? 'in-range' : ''}" data-d="${k}" ${blocked(d) ? 'disabled' : ''}>${i}</button>`;
    }
    return `<div class="month"><b>${m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</b><div class="days">${cells}</div></div>`;
  }).join('');
}
$('#cal').addEventListener('click', e => {
  const b = e.target.closest('.day'); if (!b || b.disabled) return;
  const d = new Date(b.dataset.d + 'T00:00:00');
  if (!start || end || d <= start) { start = d; end = null; }
  else {
    // pas de date bloquée au milieu du séjour
    for (let x = new Date(start); x < d; x.setDate(x.getDate() + 1)) if (blocked(x)) { toast('Une nuit de votre séjour est indisponible (bain de boue de l\'hôte).'); start = d; end = null; renderCal(); return updateBooking(); }
    end = d;
    const n = nights();
    if (n > 3) toast('Plus de 3 nuits ? L\'hôte vous déconseille fortement cette idée.');
  }
  renderCal(); updateBooking();
});
$('#clearDates').addEventListener('click', () => { start = end = null; renderCal(); updateBooking(); });
const nights = () => (start && end ? Math.round((end - start) / 86400000) : 0);
const fmtD = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function fees() {
  const n = nights();
  return [[`${euro(NIGHTLY)} x ${n} nuit${n > 1 ? 's' : ''}`, NIGHTLY * n], ['Frais de ménage (boue fraîche)', 15], ['Frais de service tanières', 12], ['Taxe sur les oignons', 3], ['Assurance anti-fourches', 9]];
}
function updateBooking() {
  $('#fIn span').textContent = start ? fmtD(start) : 'Ajouter une date';
  $('#fOut span').textContent = end ? fmtD(end) : 'Ajouter une date';
  const n = nights();
  $('#calTitle').textContent = n ? `${n} nuit${n > 1 ? 's' : ''} au Marais` : start ? 'Sélectionnez la date de départ' : 'Sélectionnez vos dates';
  $('#calSub').textContent = n ? `${fmtD(start)} – ${fmtD(end)}` : 'Ajoutez vos dates de voyage pour voir les prix exacts (et la réaction de l\'hôte).';
  $('#bookBtn').textContent = n ? 'Réserver' : 'Vérifier la disponibilité';
  const f = $('#fees');
  if (!n) { f.hidden = true; return; }
  const rows = fees(), tot = rows.reduce((a, [, v]) => a + v, 0);
  f.innerHTML = rows.map(([l, v]) => `<div class="row"><span>${l}</span><span>${euro(v)}</span></div>`).join('') + `<div class="row tot"><span>Total</span><span>${euro(tot)}</span></div>`;
  f.hidden = false;
}
['#fIn', '#fOut'].forEach(s => $(s).addEventListener('click', () => $('#calTitle').scrollIntoView({ behavior: 'smooth', block: 'center' })));
renderCal(); updateBooking();

/* voyageurs : 1 maximum */
let guests = 1;
$('#gPlus').addEventListener('click', () => { toast(pick(['L\'hôte n\'accepte qu\'un voyageur. Et encore.', 'Un âne bavard ne compte pas comme un voyageur. Il compte comme deux.', 'Capacité maximale atteinte : 1 (l\'hôte trouve ça déjà beaucoup).'])); $('#gCount').animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 250 }); });
$('#gMinus').addEventListener('click', () => toast(guests === 1 ? 'Zéro voyageur ? L\'hôte adore cette option. Malheureusement, il faut quelqu\'un pour payer.' : ''));

/* ------------------------------------------------------------------ avis */
const CATS = [['Propreté', 2.1], ['Précision', 5.0], ['Communication', 1.8], ['Emplacement', 5.0], ['Arrivée', 3.4], ['Qualité-prix', 4.9]];
$('#cats').innerHTML = CATS.map(([l, v]) => `<div class="cat"><span>${l}</span><span class="tr"><i style="width:${v * 20}%"></i></span><small>${v.toFixed(1).replace('.', ',')}</small></div>`).join('');
const REVIEWS = [
  { n: 'L\'Âne', e: '🫏', c: '#e7e2f3', d: 'novembre 2025', s: 5, t: 'Endroit IN-CROY-ABLE ! J\'ai parlé toute la nuit, l\'hôte a adoré (je crois). Je reviens demain. Et après-demain. Et le jour d\'après.', r: 'Non.' },
  { n: 'Fiona', e: '👸', c: '#f3e3cf', d: 'octobre 2025', s: 5, t: 'Venue pour une nuit, restée pour toujours. Le bain de boue change une vie. Je recommande à toutes les princesses (enfin, pas à toutes).', r: 'Elle peut rester.' },
  { n: 'Lord F.', e: '👑', c: '#f6e9b8', d: 'septembre 2025', s: 1, t: 'Tout est beaucoup trop grand : la porte, le lit, l\'hôte. Je n\'atteignais pas la poignée des toilettes.', r: 'Bon débarras.' },
  { n: 'Pinocchio', e: '🪵', c: '#f1e2cc', d: 'août 2025', s: 5, t: 'Je n\'ai absolument rien à reprocher à ce logement. Tout était parfaitement propre.', flag: 'Avis signalé : le nez de l\'auteur s\'est allongé de 40 cm pendant la rédaction.' },
  { n: 'Ti-Biscuit', e: '🍪', c: '#f5dfc9', d: 'juillet 2025', s: 2, t: 'Pas touche à mes boutons en guimauve ! L\'hôte m\'a regardé comme un goûter pendant tout le séjour.', r: 'Je n\'ai rien fait.' },
  { n: 'Le Chat Potté', e: '🐱', c: '#f6e0c4', d: 'juin 2025', s: 4, t: 'Accueil glacial. Mais les grands yeux ont fonctionné : surclassement en lit de feuilles double.' },
  { n: 'Les Trois Petits Cochons', e: '🐷', c: '#f8dce2', d: 'mai 2025', s: 3, t: 'Belle bâtisse, mais en souche ? Au premier souffle un peu fort… Nous, on conseille la brique.' },
  { n: 'Dragonne', e: '🐉', c: '#f8d8d3', d: 'avril 2025', s: 5, t: 'Le chauffage a très bien fonctionné. C\'était moi.', r: 'Merci de rembourser le toit.' },
];
const stars = s => '★'.repeat(s) + '☆'.repeat(5 - s);
const rvHtml = r => `<div class="rv"><div class="rv-head"><span class="rv-av" style="background:${r.c}">${r.e}</span><div><b>${r.n}</b><span>${r.d}</span></div></div>
  <span class="rv-stars">${stars(r.s)}</span><p>${r.t}</p>${r.flag ? `<span class="flag">⚠ ${r.flag}</span>` : ''}${r.r ? `<p class="host-reply"><b>Réponse de l'hôte :</b> ${r.r}</p>` : ''}</div>`;
$('#rvGrid').innerHTML = REVIEWS.slice(0, 6).map(rvHtml).join('');
$('#allReviews').addEventListener('click', () => open(`<h3>★ 4,21 · 1 042 commentaires</h3><div class="rv-grid" style="grid-template-columns:1fr">${REVIEWS.map(rvHtml).join('')}<p class="muted">Les 1 034 autres commentaires ont été arrachés. Ils servent de papier.</p></div>`));

/* ------------------------------------------------------------------ discussion avec l'hôte */
function chat(lines) {
  // lines : suite d'étapes ; chaque étape = { host } | { me } | { sys } | { choices: [[label, next]] } | { html } | { run }
  open(`<h3>Shrek <span class="muted" style="font-weight:500;font-size:14px">· répond en général jamais</span></h3><div class="chat" id="chat"></div><div class="choices" id="choices"></div>`);
  const box = $('#chat'), ch = $('#choices');
  const add = (cls, html) => { const m = document.createElement('div'); m.className = 'msg ' + cls; m.innerHTML = html; box.appendChild(m); m.scrollIntoView({ block: 'nearest' }); return m; };
  const hostMsg = async text => {
    const t = add('host', `<span class="avatar">${ogreFace('c' + Math.random().toString(36).slice(2, 6))}</span><span class="typing"><span></span><span></span><span></span></span>`);
    await wait(900 + Math.min(1600, text.length * 22));
    $('.typing', t).outerHTML = `<span>${text}</span>`; plop();
  };
  const runSteps = async steps => {
    for (const s of steps) {
      if (modal.hidden) return;
      if (s.sys) add('sys', s.sys);
      if (s.me) { add('me', s.me); await wait(300); }
      if (s.host) await hostMsg(s.host);
      if (s.html) { const d = document.createElement('div'); d.innerHTML = s.html; box.appendChild(d); }
      if (s.run) await s.run();
      if (s.choices) {
        ch.innerHTML = s.choices.map(([l], i) => `<button type="button" data-i="${i}">${l}</button>`).join('');
        const i = await new Promise(res => ch.onclick = e => { const b = e.target.closest('button'); if (b) res(+b.dataset.i); });
        ch.innerHTML = '';
        const [label, next] = s.choices[i];
        add('me', label); await wait(250);
        await runSteps(typeof next === 'function' ? next() : next);   // puis on reprend la suite de cette étape
      }
    }
  };
  runSteps(lines);
}

let tried = new Set();
function bookingFlow() {
  const n = nights();
  const ask = () => {
    const opts = [
      ['Je suis très calme', [{ host: 'Les gens calmes, c\'est les pires. Ils restent.' }]],
      ['J\'apporte des oignons', [{ host: '…Combien ?' }, { choices: [['Trois', [{ host: 'Pff. Radin.' }]], ['Un sac', [{ host: 'Hmm. Ça se discute.' }]], ['Tous les oignons du royaume', [{ host: '…Vous me plaisez presque.' }]]] }]],
      ['Je suis une princesse', [{ host: 'NON. Il y a déjà eu une princesse. Ça s\'est mal fini (bien, en fait, mais on n\'en parle pas).' }]],
      ['Je viens avec un âne', [{ host: 'ABSOLUMENT PAS.' }]],
    ].filter(([l]) => !tried.has(l));
    return [{ choices: opts.map(([l, steps]) => [l, () => { tried.add(l); return [...steps, ...(tried.size >= 2 ? accept() : ask())]; }]) }];
  };
  const accept = () => [
    { host: 'Bon. D\'accord. Mais vous ne touchez PAS aux toilettes.' },
    { html: `<div class="ticket"><div class="stamp" id="stamp">CONFIRMÉ</div><b>Réservation confirmée</b><br/>${n ? `${fmtD(start)} – ${fmtD(end)} · ${n} nuit${n > 1 ? 's' : ''}` : 'Dates : quand l\'hôte voudra'} · 1 voyageur<br/>Code d'accès : la porte ronde<br/>Toilettes : <b>interdites</b></div>` },
    { run: async () => { await wait(200); $('#stamp')?.classList.add('down'); thud(90, 0.4); } },
    { choices: [['Promis, je n\'y toucherai pas', [{ host: 'Je vous ai à l\'œil.' }]], ['J\'utiliserai les toilettes quand même', () => { setTimeout(() => { close(); visit(true); }, 500); return [{ host: '…Pardon ?' }]; }]] },
  ];
  chat([{ sys: `Demande de réservation · ${n ? `${fmtD(start)} – ${fmtD(end)}` : 'dates non précisées'} · 1 voyageur` }, { host: 'Non.' }, ...ask()]);
}
$('#bookBtn').addEventListener('click', () => {
  if (!nights()) { $('#calTitle').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Choisissez d\'abord vos dates. L\'hôte, lui, espère que vous n\'en trouverez pas.'); return; }
  tried = new Set(); bookingFlow();
});
$('#contact').addEventListener('click', () => chat([{ sys: 'Nouveau message' }, { host: 'Quoi ?' }, { choices: [['Bonjour ! J\'avais une petite question…', [{ host: 'Non.' }]], ['Les toilettes sont libres ?', [{ host: 'Elles ne sont JAMAIS libres.' }]]] }]));

/* ------------------------------------------------------------------ visite virtuelle des toilettes */
function visit(furious = false) {
  open(`<div class="visit"><div class="stage" id="vStage">${outhouse('v1', { door: false })}
      <div class="ogre" id="vOgre">${ogreOut()}</div>
      <div class="door" id="vDoor">${door()}</div></div>
      <p id="vNote">Visite virtuelle · Cliquez sur la porte pour entrer.</p></div>`, { wide: true, dark: true });
  const st = $('#vStage'), dr = $('#vDoor'), og = $('#vOgre'), note = $('#vNote');
  let knocks = 0, shoutEl = null;
  const shout = (txt, big = false) => { shoutEl?.remove(); shoutEl = document.createElement('div'); shoutEl.className = 'shout' + (big ? ' big' : ''); shoutEl.textContent = txt; st.appendChild(shoutEl); };
  const burst = () => {
    st.onclick = null;
    dr.classList.add('burst'); og.classList.add('out');
    roar(); shout('GRRRAAAAAH !', true);
    document.body.classList.remove('quake'); void document.body.offsetWidth; document.body.classList.add('quake');
    note.innerHTML = 'Vous avez dérangé l\'hôte. <b>Note de l\'hôte pour vous : ★☆☆☆☆</b>';
    setTimeout(() => { shout('Et ne revenez pas !'); }, 1700);
    banned = true;
  };
  if (furious) { setTimeout(burst, 500); return; }
  st.onclick = () => {
    knocks++;
    if (knocks === 1) { knock(); dr.classList.remove('knock'); void dr.offsetWidth; dr.classList.add('knock'); setTimeout(() => shout('OCCUPÉ !'), 350); note.textContent = 'Il y a quelqu\'un. Frapper encore ?'; }
    else if (knocks === 2) { knock(); dr.classList.remove('rattle'); void dr.offsetWidth; dr.classList.add('rattle'); setTimeout(() => shout('J\'AI DIT : OCCUPÉ !'), 300); note.textContent = 'Vraiment ? Encore ?'; }
    else burst();
  };
}
$('#visit').addEventListener('click', () => visit());
$('#toiletsImg').addEventListener('click', () => visit());
$('#toiletsImg').style.cursor = 'pointer';

let banned = false;
// une fois banni, l'annonce le fait savoir
const obs = new MutationObserver(() => {
  if (modal.hidden && banned && !$('.banned-bar')) {
    const bar = document.createElement('div');
    bar.className = 'banned-bar';
    bar.innerHTML = '🚫 Vous avez été ajouté à la liste noire du marais. Vos prochaines réservations seront refusées, par principe.';
    bar.style.cssText = 'background:#fdecea;color:#9b2c22;font-weight:700;font-size:14px;padding:12px 16px;border-radius:12px;margin-top:16px;';
    $('#book').appendChild(bar);
    $('#bookBtn').textContent = 'Réserver (inutile)';
  }
});
obs.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
