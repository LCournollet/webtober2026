/*
 * Le Nez — maison de dégustation olfactive (fictive). Cave, fiches de dégustation, atelier d'assemblage, quiz.
 */
import { AXES, CUVEES, NOTES } from './data.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
let uid = 0;

/* ------------------------------------------------------------------ dessins : bouteilles, verre, roue des arômes */
const SHAPES = {
  // silhouettes de bouteille (viewBox 0 0 120 320), le liquide remplit la partie basse
  bordeaux: 'M48 8h24v70c0 14 30 22 30 48v178c0 6-4 10-10 10H28c-6 0-10-4-10-10V126c0-26 30-34 30-48z',
  bourgogne: 'M50 8h20v74c0 30 34 50 34 86v136c0 6-4 10-10 10H26c-6 0-10-4-10-10V168c0-36 34-56 34-86z',
  flacon: 'M46 8h28v40h-6v18c26 6 40 26 40 52v188c0 4-4 8-8 8H20c-4 0-8-4-8-8V118c0-26 14-46 40-52V48h-6z',
};
function bottle(c, { title = c.name, year = c.year, small = false } = {}) {
  const id = 'b' + (++uid), path = SHAPES[c.shape] || SHAPES.bordeaux;
  const words = title.split(' '), half = Math.ceil(words.length / 2);
  const l1 = words.slice(0, half).join(' '), l2 = words.slice(half).join(' ');
  return `<svg viewBox="0 0 120 330" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath id="${id}c"><path d="${path}"/></clipPath>
      <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.liquid}" stop-opacity=".95"/><stop offset="1" stop-color="${c.liquid}" stop-opacity=".7"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="322" rx="46" ry="6" fill="#000" opacity=".5"/>
    <g clip-path="url(#${id}c)">
      <rect width="120" height="330" fill="#0d1a12" opacity=".55"/>
      <rect y="96" width="120" height="240" fill="url(#${id}l)"/>
      <ellipse cx="60" cy="96" rx="70" ry="5" fill="#fff" opacity=".12"/>
      ${small ? '' : Array.from({ length: 7 }, (_, i) => `<circle cx="${30 + (i * 37) % 60}" cy="${300 - (i * 53) % 180}" r="${1 + (i % 3)}" fill="#fff" opacity=".18"><animate attributeName="cy" values="${300 - (i * 53) % 180};${110 + i * 4}" dur="${3 + i * 0.7}s" repeatCount="indefinite"/></circle>`).join('')}
      <rect width="120" height="330" fill="url(#${id}g)"/>
    </g>
    <path d="${path}" fill="none" stroke="#e8cf98" stroke-opacity=".35" stroke-width="1"/>
    <rect x="44" y="0" width="32" height="26" rx="2" fill="#1a1510" stroke="#c9a35a" stroke-width="1"/>
    <rect x="44" y="16" width="32" height="4" fill="#c9a35a" opacity=".7"/>
    <g transform="translate(22 170)">
      <rect width="76" height="96" fill="#efe6d4"/>
      <rect x="3" y="3" width="70" height="90" fill="none" stroke="${c.label}" stroke-width=".8"/>
      <text x="38" y="18" text-anchor="middle" font-family="Cinzel" font-size="6" letter-spacing="1.5" fill="${c.label}">LE NEZ</text>
      <path d="M24 23h28" stroke="#c9a35a" stroke-width=".8"/>
      <text x="38" y="40" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-size="10" fill="${c.label}">${esc(l1)}</text>
      <text x="38" y="52" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-size="10" fill="${c.label}">${esc(l2)}</text>
      <text x="38" y="72" text-anchor="middle" font-family="Cinzel" font-size="8" fill="#9a7a3a">${year}</text>
      <text x="38" y="84" text-anchor="middle" font-family="Cinzel" font-size="4.4" letter-spacing=".8" fill="${c.label}" opacity=".7">À SENTIR AVEC MODÉRATION</text>
    </g>
  </svg>`;
}

function radar(vals, { size = 240, color = '#8fa65a' } = {}) {
  const cx = size / 2, cy = size / 2, R = size * 0.34, n = AXES.length;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const rings = [1, 2, 3, 4, 5].map(k => `<polygon points="${AXES.map((_, i) => pt(i, R * k / 5).join(',')).join(' ')}" fill="none" stroke="rgba(201,163,90,.18)"/>`).join('');
  const spokes = AXES.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="rgba(201,163,90,.18)"/>`).join('');
  const shape = vals.map((v, i) => pt(i, R * v / 5).join(',')).join(' ');
  const labels = AXES.map((a, i) => { const [x, y] = pt(i, R + 18); return `<text x="${x}" y="${y + 3}" text-anchor="middle">${a.toUpperCase()}</text>`; }).join('');
  return `<svg class="radar" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${rings}${spokes}<polygon points="${shape}" fill="${color}" fill-opacity=".28" stroke="${color}" stroke-width="1.5"><animate attributeName="opacity" from="0" to="1" dur=".8s"/></polygon>${vals.map((v, i) => `<circle cx="${pt(i, R * v / 5)[0]}" cy="${pt(i, R * v / 5)[1]}" r="2.5" fill="${color}"/>`).join('')}${labels}</svg>`;
}

const noses = n => `<span class="noses" title="Intensité ${n}/5">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= n ? 'on' : ''}">👃</i>`).join('')}</span>`;

/* le verre de dégustation du hero, avec un nuage verdâtre qui s'en échappe */
$('#glass').innerHTML = `<svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="gl" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".3" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient>
    <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7b95e"/><stop offset="1" stop-color="#5e6b2a"/></linearGradient>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c9a35a" stop-opacity=".25"/><stop offset="1" stop-color="#c9a35a" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="150" cy="200" rx="160" ry="170" fill="url(#halo)"/>
  <path d="M86 70 C70 150 82 210 150 222 C218 210 230 150 214 70 Z" fill="url(#gl)" stroke="#e8cf98" stroke-opacity=".5"/>
  <path d="M80 150 C84 200 104 216 150 220 C196 216 216 200 220 150 Z" fill="url(#liq)" opacity=".85"/>
  <ellipse cx="150" cy="150" rx="70" ry="9" fill="#c5d47a" opacity=".55"/>
  <path d="M146 222 v120 h8 v-120" fill="url(#gl)" stroke="#e8cf98" stroke-opacity=".4"/>
  <ellipse cx="150" cy="350" rx="58" ry="10" fill="url(#gl)" stroke="#e8cf98" stroke-opacity=".45"/>
  <path d="M104 92 C100 130 104 170 118 196" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="150" cy="70" rx="64" ry="7" fill="none" stroke="#e8cf98" stroke-opacity=".6"/>
</svg>`;

/* fumée (canvas) : des volutes vert-de-gris qui montent du verre */
(() => {
  const cv = $('#smoke'), g = cv.getContext('2d');
  let W, H, parts = [];
  const src = () => { const r = $('#glass').getBoundingClientRect(), h = $('.hero').getBoundingClientRect(); return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height * 0.18 }; };
  const resize = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
  addEventListener('resize', resize); resize();
  const tick = () => {
    const s = src();
    if (parts.length < 90) parts.push({ x: s.x + (Math.random() - 0.5) * 60, y: s.y, r: 10 + Math.random() * 18, vy: -(0.3 + Math.random() * 0.5), vx: (Math.random() - 0.5) * 0.3, life: 0, max: 380 + Math.random() * 260, ph: Math.random() * 6 });
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.life++; p.y += p.vy; p.x += p.vx + Math.sin(p.life / 40 + p.ph) * 0.35; p.r += 0.12;
      const k = p.life / p.max, a = Math.sin(Math.PI * k) * 0.13;
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gr.addColorStop(0, `rgba(160, 185, 90, ${a})`); gr.addColorStop(1, 'rgba(160, 185, 90, 0)');
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    }
    parts = parts.filter(p => p.life < p.max);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ------------------------------------------------------------------ la cave */
const GROUPS = { urbain: ['metro', 'oeuf', 'vestiaire', 'frigo'], domestique: ['poubelle', 'chien', 'basket', 'chaussette', 'munster'] };
function renderCave(filter = 'all') {
  const list = CUVEES.filter(c => filter === 'all' || (filter === '5' ? c.inten === 5 : GROUPS[filter]?.includes(c.id)));
  $('#grid').innerHTML = list.map(c => `<article class="bottle-card" data-id="${c.id}" tabindex="0">
      <div class="b-art"><svg class="vapor" viewBox="0 0 80 70"><path d="M20 70c-10-14 10-22 0-38"/><path d="M40 70c-10-14 10-22 0-38"/><path d="M60 70c-10-14 10-22 0-38"/></svg>${bottle(c, { small: true })}</div>
      <div class="yr">Millésime ${c.year}</div><h3>${esc(c.name)}</h3><div class="ap">${esc(c.appel)}</div>
      <div class="meta">${noses(c.inten)}<span class="score">${c.score}<small>/100</small></span></div>
    </article>`).join('');
}
renderCave();
$('#filters').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#filters button').forEach(x => x.classList.toggle('on', x === b));
  renderCave(b.dataset.f);
});
$('#grid').addEventListener('click', e => { const c = e.target.closest('.bottle-card'); if (c) openSheet(c.dataset.id); });
$('#grid').addEventListener('keydown', e => { if (e.key === 'Enter') { const c = e.target.closest('.bottle-card'); if (c) openSheet(c.dataset.id); } });

/* ------------------------------------------------------------------ fiche de dégustation */
const modal = $('#modal'), body = $('.sheet-body', modal);
const closeModal = () => { modal.hidden = true; document.body.style.overflow = ''; };
$('.x', modal).addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
const RATE_TXT = ['', 'Supportable', 'Éprouvant', 'Bouleversant', 'Inoubliable (hélas)', 'Chef-d\'œuvre, j\'en pleure encore'];
const ratings = (() => { try { return JSON.parse(localStorage.getItem('lenez.notes')) || {}; } catch { return {}; } })();

/** « cœur d'étable… » sous l'intitulé CŒUR : on retire le mot répété */
const trimLead = t => { const r = t.replace(/^(cœur|fond|finale)\s+(de |d'|du |des )?/i, ''); return r.charAt(0).toUpperCase() + r.slice(1); };
function openSheet(id) {
  const c = CUVEES.find(x => x.id === id);
  body.innerHTML = `<div class="sh-grid">
      <div class="sh-art"><div class="bt">${bottle(c)}</div>${radar(c.aromas)}</div>
      <div>
        <div class="sh-head"><div class="yr">Fiche de dégustation · Millésime ${c.year}</div><h3>${esc(c.name)}</h3><div class="ap">${esc(c.appel)}</div></div>
        <div class="sh-row"><h4>Robe</h4><p>${esc(c.robe)}</p></div>
        <div class="sh-row"><h4>Nez</h4><ol><li><span>ATTAQUE</span>${esc(c.nez[0])}</li><li><span>CŒUR</span>${esc(trimLead(c.nez[1]))}</li><li><span>FOND</span>${esc(trimLead(c.nez[2]))}</li></ol></div>
        <div class="sh-row"><h4>Bouche</h4><p>${esc(c.bouche)}</p></div>
        <div class="sh-row"><h4>Accords</h4><p>${esc(c.accords)}</p></div>
        <div class="sh-row"><h4>Garde</h4><p>${esc(c.garde)}</p></div>
        <div class="sh-expert">${esc(c.expert)}</div>
        <div class="sh-score"><div class="big">${c.score}<small>/100 · Jury Le Nez</small></div>
          <div class="rate" id="rate"><span>VOTRE NOTE</span>${[1, 2, 3, 4, 5].map(k => `<button type="button" data-k="${k}" aria-label="${k} nez">👃</button>`).join('')}<em id="rateTxt"></em></div>
        </div>
      </div></div>`;
  const paint = k => { $$('#rate button').forEach(b => b.classList.toggle('on', +b.dataset.k <= k)); $('#rateTxt').textContent = RATE_TXT[k] || ''; };
  paint(ratings[id] || 0);
  $('#rate').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ratings[id] = +b.dataset.k; try { localStorage.setItem('lenez.notes', JSON.stringify(ratings)); } catch { /* */ } paint(ratings[id]); });
  modal.hidden = false; document.body.style.overflow = 'hidden'; $('.sheet', modal).scrollTop = 0;
}

/* ------------------------------------------------------------------ atelier d'assemblage */
let chosen = [];   // [{ note, dose }]
function renderNotes() {
  $('#notes').innerHTML = NOTES.map(n => {
    const on = chosen.some(c => c.note.id === n.id);
    return `<button class="note ${on ? 'on' : ''}" data-id="${n.id}" ${!on && chosen.length >= 3 ? 'disabled' : ''} type="button"><span>${n.emo}</span>${esc(n.name)}</button>`;
  }).join('');
  $('#doses').innerHTML = chosen.length ? chosen.map((c, i) => `<label class="dose"><span>${c.note.emo} ${esc(c.note.name)}</span><input type="range" min="5" max="100" value="${c.dose}" data-i="${i}"/><b>${pct(i)} %</b></label>`).join('') : '<p class="muted">Sélectionnez une à trois notes ci-dessus.</p>';
}
const pct = i => { const tot = chosen.reduce((a, c) => a + c.dose, 0) || 1; return Math.round(chosen[i].dose / tot * 100); };
$('#notes').addEventListener('click', e => {
  const b = e.target.closest('.note'); if (!b || b.disabled) return;
  const n = NOTES.find(x => x.id === b.dataset.id), at = chosen.findIndex(c => c.note.id === n.id);
  if (at >= 0) chosen.splice(at, 1); else chosen.push({ note: n, dose: 50 });
  renderNotes(); compose();
});
$('#doses').addEventListener('input', e => {
  const r = e.target.closest('input[type=range]'); if (!r) return;
  chosen[+r.dataset.i].dose = +r.value;
  $$('#doses .dose b').forEach((b, i) => { b.textContent = pct(i) + ' %'; });
  compose(false);
});

const PREFIX = ['Brume', 'Souffle', 'Essence', 'Nuit', 'Élixir', 'Murmure', 'Voile', 'Esprit'];
const PERSIST = ['persistante sur trois jours', 'qui hante les rideaux', 'remarquablement tenace', 'que rien ne semble pouvoir chasser', 'd\'une longueur déraisonnable'];
let blendNo = 40 + Math.floor(Math.random() * 50), blendSeed = Math.random();
function compose(reroll = true) {
  if (reroll) { blendNo++; blendSeed = Math.random(); }
  if (!chosen.length) { $('#atBottle').innerHTML = ''; $('#atCard').innerHTML = '<p class="muted center">Votre assemblage apparaîtra ici.</p>'; return; }
  const sorted = chosen.map((c, i) => ({ ...c, p: pct(i) })).sort((a, b) => b.p - a.p);
  const main = sorted[0].note, rnd = k => k[Math.floor(blendSeed * 997) % k.length];
  const name = `${PREFIX[Math.floor(blendSeed * PREFIX.length)]} de ${main.noun}`;
  const vals = [0, 1, 2, 3, 4, 5].map(i => Math.min(5, sorted.reduce((a, c) => a + c.note.aromas[i] * c.p / 100, 0) * 1.15));
  const inten = Math.max(1, Math.min(5, Math.round(vals.reduce((a, b) => a + b, 0) / 4)));
  // « une note » est féminin : les adjectifs (au féminin dans les données) s'accordent toujours ; élision devant voyelle
  const de = w => (/^[aeiouyhœéè]/i.test(w) ? 'd’' : 'de ') + w;
  const parts = sorted.map((c, i) => `${['attaque', 'cœur', 'fond'][i]} sur une note ${c.note.adj[Math.floor(blendSeed * 3 + i) % 3]} ${de(c.note.name.toLowerCase())} (${c.p} %)`);
  const note = parts.join(', ') + `, finale ${rnd(PERSIST)}.`;
  const liquid = ['#8a7a3a', '#6f8f5a', '#a35b3c', '#5e6b4a', '#c98f3a', '#7c6a8a'][vals.indexOf(Math.max(...vals))];
  const fake = { name, year: new Date().getFullYear(), liquid, shape: ['bordeaux', 'bourgogne', 'flacon'][Math.floor(blendSeed * 3)], label: '#1f2a1c' };
  $('#atBottle').innerHTML = bottle(fake);
  $('#atCard').innerHTML = `<div class="no">Assemblage n° ${blendNo} · ${fake.year}</div><h3>« ${esc(name)} »</h3>
    ${radar(vals, { size: 220 })}
    <p>${esc(note.charAt(0).toUpperCase() + note.slice(1))}</p>
    <p>Intensité : ${noses(inten)}</p>
    <div class="row"><button class="btn-line" id="reroll" type="button">Autre nom</button><button class="btn-line" id="bottleIt" type="button">Mettre en bouteille</button></div>`;
  $('#reroll').addEventListener('click', () => compose(true));
  $('#bottleIt').addEventListener('click', () => {
    $('#bottleIt').textContent = 'Embouteillé ✓'; $('#bottleIt').disabled = true;
    $('#atCard').insertAdjacentHTML('beforeend', `<p class="muted" style="margin-top:12px;font-style:italic">Votre cuvée a été mise en bouteille, scellée à la cire et entreposée très loin de nos locaux.</p>`);
  });
}
renderNotes();

/* ------------------------------------------------------------------ l'épreuve du nez */
let quiz = null;
function startQuiz() {
  const qs = [...CUVEES].sort(() => Math.random() - 0.5).slice(0, 5).map(c => {
    const others = CUVEES.filter(x => x.id !== c.id).sort(() => Math.random() - 0.5).slice(0, 3);
    return { c, opts: [c, ...others].sort(() => Math.random() - 0.5), clue: Math.random() < 0.5 ? 'nez' : 'robe' };
  });
  quiz = { qs, i: 0, good: 0 };
  renderQuiz();
}
function renderQuiz() {
  const q = quiz.qs[quiz.i];
  const desc = q.clue === 'nez' ? `${q.c.nez[0]}, ${q.c.nez[1]}… ${q.c.nez[2]}.` : q.c.robe;
  $('#quiz').innerHTML = `<div class="q-prog">Fiche ${quiz.i + 1} / ${quiz.qs.length} · ${q.clue === 'nez' ? 'Le nez' : 'La robe'}</div>
    <p class="q-desc">« ${esc(desc)} »</p>
    <div class="q-opts">${q.opts.map(o => `<button type="button" data-id="${o.id}">${esc(o.name)}</button>`).join('')}</div>
    <p class="q-fb" id="qfb"></p>`;
  $('.q-opts').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const ok = b.dataset.id === q.c.id;
    if (ok) quiz.good++;
    $$('.q-opts button').forEach(x => { x.disabled = true; if (x.dataset.id === q.c.id) x.classList.add('good'); else if (x === b) x.classList.add('bad'); });
    $('#qfb').textContent = ok ? pick(['Remarquable. Un nez de grande classe.', 'Exact. Vous avez du métier.', 'Bravo. Vos voisins doivent vous craindre.']) : `Hélas. Il s'agissait de « ${q.c.name} ».`;
    setTimeout(() => { quiz.i++; quiz.i < quiz.qs.length ? renderQuiz() : endQuiz(); }, 1500);
  });
}
function endQuiz() {
  const g = quiz.good;
  const [title, txt] = g === 5 ? ['Nez d\'Or', 'Un odorat d\'exception. La Maison vous propose un poste. Déclinez.'] : g >= 3 ? ['Nez d\'Argent', 'Un très bon nez, encore un peu timide face aux grands crus.'] : g >= 1 ? ['Nez de Bronze', 'Des bases solides. Entraînez-vous dans le métro, ligne 13, en août.'] : ['Nez Bouché', 'Une chance, au fond. Vous traverserez la vie sans souffrir.'];
  $('#quiz').innerHTML = `<div class="diploma"><p class="over">Diplôme décerné par la Maison Le Nez</p><h3>${title}</h3><p>${g} bonne${g > 1 ? 's' : ''} réponse${g > 1 ? 's' : ''} sur 5. ${txt}</p><button class="btn-gold" id="again" type="button">Repasser l'épreuve</button></div>`;
  $('#again').addEventListener('click', startQuiz);
}
$('#quiz').innerHTML = `<p class="q-desc">Êtes-vous prêt à mettre votre nez à l'épreuve ?</p><button class="btn-gold" id="go" type="button">Commencer l'épreuve</button>`;
$('#go').addEventListener('click', startQuiz);
