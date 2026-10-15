/*
 * Le Grimoire — un livre de sorts dont on tourne les pages. Trois rituels (sceau, philtre, incantation),
 * trois sceaux sur la couverture, puis le Grand Œuvre.
 */
(() => {
  const $ = id => document.getElementById(id);
  const book = $('book'), leaves = [...document.querySelectorAll('.leaf')], N = leaves.length;
  const done = { 1: false, 2: false, 3: false };

  /* ------------------------------------------------------------------ mise à l'échelle du livre */
  function fit() {
    const s = Math.min(innerWidth / 960, (innerHeight - 90) / 680, 1.35);
    document.documentElement.style.setProperty('--s', s.toFixed(3));
  }
  addEventListener('resize', fit); fit();

  /* ------------------------------------------------------------------ son (synthétisé) */
  let ac = null, master = null, muted = false;
  function audio() {
    if (ac) return ac;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
    // bourdon grave et crépitement des bougies
    const drone = ac.createGain(); drone.gain.value = 0.035; drone.connect(master);
    [55, 82.5, 110.3].forEach((f, i) => { const o = ac.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = i * 4; o.connect(drone); o.start(); });
    const crackle = () => { if (!ac) return; noise(0.02 + Math.random() * 0.03, 2500 + Math.random() * 3000, 0.02 + Math.random() * 0.03); setTimeout(crackle, 120 + Math.random() * 900); };
    crackle();
    return ac;
  }
  function noise(dur, freq, vol, q = 1.2) {
    if (!ac || muted) return;
    const t = ac.currentTime, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function tone(freq, dur, vol = 0.08, type = 'sine', at = 0) {
    if (!ac || muted) return;
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  const SFX = {
    flip: () => { noise(0.35, 1400, 0.12, 0.6); noise(0.18, 3200, 0.05); },
    chime: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 2.2, 0.06, 'sine', i * 0.09)),
    fail: () => { tone(98, 0.6, 0.15, 'triangle'); noise(0.5, 300, 0.12); },
    tick: () => tone(1200, 0.12, 0.04),
    plop: () => { tone(220 + Math.random() * 120, 0.18, 0.08, 'sine'); noise(0.12, 900, 0.05); },
    grand: () => { [130.8, 196, 261.6, 392, 523.3, 784].forEach((f, i) => tone(f, 6, 0.06, i % 2 ? 'sine' : 'triangle', i * 0.25)); noise(3, 600, 0.12, 0.4); },
  };
  $('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'muet' : 'son'; if (master) master.gain.value = muted ? 0 : 0.8; });

  /* ------------------------------------------------------------------ pages */
  let current = 0;   // nombre de feuillets tournés
  function layout() {
    leaves.forEach((l, i) => { l.classList.toggle('flipped', i < current); l.style.zIndex = i < current ? i + 1 : N - i + 10; });
    book.classList.toggle('closed', current === 0);
    $('prev').disabled = current === 0; $('next').disabled = current >= N - 1;
  }
  function go(to) {
    to = Math.max(0, Math.min(N - 1, to)); if (to === current) return;   // la dernière page (le Grand Œuvre) ne se tourne pas
    audio(); SFX.flip(); current = to; layout();
  }
  // premier placement sans animation (le livre est déjà posé fermé quand la page s'affiche)
  book.style.transition = 'none'; leaves.forEach(l => { l.style.transition = 'none'; });
  layout(); void book.offsetWidth;
  requestAnimationFrame(() => { book.style.transition = ''; leaves.forEach(l => { l.style.transition = ''; }); });
  leaves.forEach((l, i) => l.addEventListener('click', e => {
    if (e.target.closest('canvas, button, input, form, .ing, .cauldron, .hand')) return;
    go(i < current ? i : i + 1);
  }));
  $('prev').addEventListener('click', () => go(current - 1));
  $('next').addEventListener('click', () => go(current + 1));
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') go(current + 1); if (e.key === 'ArrowLeft') go(current - 1); });

  function seal(n, msgEl, msg) {
    done[n] = true; $('seal' + n).classList.add('on');
    msgEl.textContent = msg; msgEl.className = 'status ok';
    SFX.chime();
    if (done[1] && done[2] && done[3]) { $('hand').classList.add('ready'); $('st4').textContent = 'Pose la main sur la page.'; }
  }

  /* ------------------------------------------------------------------ rituel I : le sceau (pentacle) */
  (() => {
    const cv = $('pentacle'), g = cv.getContext('2d'), C = { x: 210, y: 215 }, R = 150;
    const P = [0, 1, 2, 3, 4].map(k => ({ x: C.x + Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 5) * R, y: C.y + Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 5) * R }));
    const ORDER = [0, 2, 4, 1, 3, 0];
    let step = 0, drawing = false, cur = null, glow = 0, finished = false;
    const toC = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
    const near = (p, q, r = 30) => Math.hypot(p.x - q.x, p.y - q.y) < r;
    function draw() {
      g.clearRect(0, 0, cv.width, cv.height);
      g.lineCap = 'round'; g.lineJoin = 'round';
      // cercle guide, très pâle
      g.strokeStyle = 'rgba(90, 58, 32, .25)'; g.lineWidth = 1.2; g.setLineDash([3, 6]);
      g.beginPath(); g.arc(C.x, C.y, R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      // tracé à l'encre
      const ink = finished ? `rgba(122, 31, 18, ${0.85 + 0.15 * Math.sin(glow)})` : 'rgba(59, 36, 20, .9)';
      g.strokeStyle = ink; g.lineWidth = 4;
      if (finished) { g.shadowColor = 'rgba(216, 150, 60, .9)'; g.shadowBlur = 14; }
      g.beginPath();
      for (let i = 0; i <= step; i++) { const p = P[ORDER[i]]; i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
      if (drawing && cur && !finished) g.lineTo(cur.x, cur.y);
      g.stroke(); g.shadowBlur = 0;
      if (finished) { g.lineWidth = 3; g.beginPath(); g.arc(C.x, C.y, R + 18, 0, Math.PI * 2 * Math.min(1, glow / 3)); g.stroke(); runes(); }
      // les pointes
      P.forEach((p, k) => {
        const next = !finished && ORDER[step + 1] === k, start = !finished && step === 0 && k === 0;
        g.fillStyle = next || start ? 'rgba(122, 31, 18, .9)' : 'rgba(59, 36, 20, .75)';
        g.beginPath(); g.arc(p.x, p.y, next || start ? 9 + Math.sin(performance.now() / 200) * 1.5 : 6, 0, Math.PI * 2); g.fill();
      });
    }
    const GLYPHS = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    function runes() {
      g.save(); g.translate(C.x, C.y); g.fillStyle = 'rgba(122, 31, 18, .85)'; g.font = '20px serif'; g.textAlign = 'center';
      const n = 24, shown = Math.floor(Math.min(1, Math.max(0, glow - 2) / 2) * n);
      for (let i = 0; i < shown; i++) { g.save(); g.rotate(i / n * Math.PI * 2 + glow * 0.05); g.fillText(GLYPHS[i % GLYPHS.length], 0, -(R + 40)); g.restore(); }
      g.restore();
    }
    function fail() {
      step = 0; drawing = false; SFX.fail(); cv.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 300 });
      $('st1').textContent = 'L\'encre a bavé. Recommence par la pointe du haut.'; $('st1').className = 'status ko';
    }
    cv.addEventListener('pointerdown', e => {
      if (finished) return; audio(); cv.setPointerCapture(e.pointerId);
      const p = toC(e), from = P[ORDER[step]];
      if (near(p, from)) { drawing = true; cur = p; $('st1').className = 'status'; $('st1').textContent = 'Sans trembler…'; }
      else if (step === 0) { $('st1').textContent = 'Commence par la pointe du haut.'; }
    });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return; cur = toC(e);
      const nextIdx = ORDER[step + 1];
      if (near(cur, P[nextIdx])) {
        step++; SFX.tick();
        if (step === ORDER.length - 1) { finished = true; drawing = false; seal(1, $('st1'), 'Le sceau est scellé.'); }
      } else {
        // toucher une autre pointe que la bonne : l'encre bave
        P.forEach((q, k) => { if (drawing && k !== nextIdx && k !== ORDER[step] && near(cur, q, 22)) fail(); });
      }
    });
    addEventListener('pointerup', () => { drawing = false; });
    (function loop() { if (finished) glow += 0.03; draw(); requestAnimationFrame(loop); })();
  })();

  /* ------------------------------------------------------------------ rituel II : le philtre */
  (() => {
    const ING = [
      { id: 'mandrake', e: '🌱', n: 'Racine de mandragore' }, { id: 'toad', e: '🐸', n: 'Bave de crapaud' },
      { id: 'moon', e: '✨', n: 'Poussière de lune' }, { id: 'salt', e: '🧂', n: 'Sel de mer' },
      { id: 'mush', e: '🍄', n: 'Amanite' }, { id: 'feather', e: '🪶', n: 'Plume de corbeau' },
    ];
    const ORDER = ['moon', 'feather', 'mandrake', 'salt'];
    const COLORS = [['#6b5a3a', '#2d2416'], ['#7a7a9a', '#2c2c46'], ['#4a3a6a', '#1c1430'], ['#5a2e7a', '#240f38'], ['#b07cff', '#4a1a8a']];
    let step = 0, finished = false;
    const shelf = $('shelf'), caul = $('cauldron');
    shelf.innerHTML = ING.map(i => `<div class="ing" data-id="${i.id}"><span>${i.e}</span>${i.n}</div>`).join('');
    const setLiquid = k => { $('liqA').setAttribute('stop-color', COLORS[k][0]); $('liqB').setAttribute('stop-color', COLORS[k][1]); };
    function pour(id, el) {
      if (finished) return; audio();
      if (id === ORDER[step]) {
        step++; el.classList.add('used'); SFX.plop(); setLiquid(step); bubble(6);
        $('st2').className = 'status'; $('st2').textContent = ['', 'La surface frémit…', 'Le philtre s\'assombrit…', 'Une odeur de terre monte…', ''][step];
        if (step === ORDER.length) { finished = true; caul.classList.add('hot'); seal(2, $('st2'), 'Le philtre luit dans le chaudron.'); setInterval(() => bubble(2), 600); }
      } else {
        step = 0; SFX.fail(); setLiquid(0); caul.classList.remove('fail'); void caul.offsetWidth; caul.classList.add('fail');
        shelf.querySelectorAll('.ing').forEach(i => i.classList.remove('used'));
        $('st2').textContent = 'Une fumée noire s\'échappe. Tout est à refaire.'; $('st2').className = 'status ko';
      }
    }
    function bubble(n) {
      const grp = $('bubbles');
      for (let k = 0; k < n; k++) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'), x = 70 + Math.random() * 160, r = 3 + Math.random() * 7;
        c.setAttribute('cx', x); c.setAttribute('cy', 92); c.setAttribute('r', r); c.setAttribute('fill', finished ? '#d9b8ff' : '#a99a7a'); c.setAttribute('opacity', '.8');
        grp.appendChild(c);
        c.animate([{ transform: 'translateY(0)', opacity: 0.8 }, { transform: `translateY(${-30 - Math.random() * 40}px)`, opacity: 0 }], { duration: 900 + Math.random() * 600, easing: 'ease-out' }).onfinish = () => c.remove();
      }
    }
    // glisser-déposer (ou simple clic) des ingrédients sur le chaudron
    shelf.addEventListener('pointerdown', e => {
      const el = e.target.closest('.ing'); if (!el || finished) return;
      e.preventDefault();
      const ghost = el.cloneNode(true); ghost.classList.add('drag'); document.body.appendChild(ghost);
      const move = ev => { ghost.style.left = ev.clientX - 40 + 'px'; ghost.style.top = ev.clientY - 30 + 'px'; };
      move(e);
      const sx = e.clientX, sy = e.clientY;
      const up = ev => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); ghost.remove();
        const r = caul.getBoundingClientRect(), moved = Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8;
        const inside = ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top - 30 && ev.clientY < r.bottom;
        if (inside || !moved) pour(el.dataset.id, el);
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
  })();

  /* ------------------------------------------------------------------ rituel III : l'incantation */
  (() => {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ');
    const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
    // la reconnaissance vocale comprend mal le latin : on accepte les approximations (« lumen et ténèbres »…)
    const ok = s => { const w = norm(s).split(/\s+/).filter(Boolean); const has = (t, tol) => w.some(x => lev(x, t) <= tol); return has('lumen', 2) && (has('tenebris', 3) || has('tenebres', 3)); };
    let finished = false;
    function success() {
      if (finished) return; finished = true;
      $('mouth').classList.remove('listening'); $('mouth').classList.add('done');
      document.body.classList.remove('flare'); void document.body.offsetWidth; document.body.classList.add('flare');
      seal(3, $('st3'), 'Les flammes se sont redressées. Le livre a entendu.');
    }
    function miss(heard) { $('st3').className = 'status ko'; $('st3').textContent = heard ? `Le livre a entendu « ${heard} »… ce n'est pas la formule.` : 'Le livre n\'a rien entendu.'; SFX.fail(); }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    $('speak').addEventListener('click', () => {
      audio(); if (finished) return;
      if (!SR) { $('st3').textContent = 'Ton navigateur ne prête pas l\'oreille. Écris la formule à la plume.'; $('write').focus(); return; }
      const r = new SR(); r.lang = 'fr-FR'; r.interimResults = true; r.maxAlternatives = 5;
      $('mouth').classList.add('listening'); $('st3').className = 'status'; $('st3').textContent = 'Le livre écoute…';
      let best = '';
      r.onresult = ev => {
        for (const res of ev.results) for (const alt of res) { best = alt.transcript; if (ok(alt.transcript)) { r.stop(); success(); return; } }
      };
      r.onerror = () => { $('mouth').classList.remove('listening'); $('st3').textContent = 'Le micro est resté muet. Tu peux écrire la formule.'; };
      r.onend = () => { $('mouth').classList.remove('listening'); if (!finished) miss(best); };
      r.start();
    });
    $('writeForm').addEventListener('submit', e => {
      e.preventDefault(); audio(); if (finished) return;
      const v = $('write').value; ok(v) ? success() : miss(v);
    });
  })();

  /* ------------------------------------------------------------------ le grand œuvre */
  const mg = $('magic'), m = mg.getContext('2d');
  function sizeMagic() { const d = Math.min(2, devicePixelRatio || 1); mg.width = innerWidth * d; mg.height = innerHeight * d; m.setTransform(d, 0, 0, d, 0, 0); }
  addEventListener('resize', sizeMagic); sizeMagic();
  let grand = -1, parts = [];
  $('hand').addEventListener('click', () => {
    if (!$('hand').classList.contains('ready') || grand >= 0) return;
    grand = 0; SFX.grand(); book.classList.add('shake');
    setTimeout(() => book.classList.remove('shake'), 600);
    document.body.classList.add('flare');
    $('st4').textContent = 'Le sort est accompli.'; $('st4').className = 'status ok';
  });
  const GL = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ☉☽♄♃♂♀☿';
  (function loop() {
    requestAnimationFrame(loop);
    m.clearRect(0, 0, innerWidth, innerHeight);
    if (grand < 0) return;
    grand += 1 / 60;
    const cx = innerWidth / 2, cy = innerHeight / 2, k = Math.min(1, grand / 2.5), fade = grand > 7 ? Math.max(0, 1 - (grand - 7) / 2) : 1;
    m.save(); m.globalCompositeOperation = 'lighter';
    // cercles runiques qui s'ouvrent et tournent
    for (let ring = 0; ring < 3; ring++) {
      const r = (120 + ring * 90) * (0.2 + 0.8 * k) * Math.min(innerWidth, innerHeight) / 700, n = 18 + ring * 10, dirn = ring % 2 ? -1 : 1;
      m.strokeStyle = `rgba(232, 190, 100, ${0.5 * fade})`; m.lineWidth = 1.5;
      m.beginPath(); m.arc(cx, cy, r, 0, Math.PI * 2 * k); m.stroke();
      m.fillStyle = `rgba(255, 220, 140, ${0.8 * fade})`; m.font = `${14 + ring * 4}px serif`; m.textAlign = 'center';
      for (let i = 0; i < n * k; i++) { const a = i / n * Math.PI * 2 + grand * 0.3 * dirn; m.save(); m.translate(cx + Math.cos(a) * (r + 14), cy + Math.sin(a) * (r + 14)); m.rotate(a + Math.PI / 2); m.fillText(GL[(i + ring * 7) % GL.length], 0, 0); m.restore(); }
    }
    // étincelles qui spiralent vers le haut
    if (grand < 6) for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 300 * k; parts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a, r, life: 0, max: 2 + Math.random() * 2 }); }
    parts = parts.filter(p => (p.life += 1 / 60) < p.max);
    for (const p of parts) { p.a += 0.02; p.r *= 1.004; p.y -= 0.6; const x = cx + Math.cos(p.a) * p.r, y = p.y - (cy - cy) + Math.sin(p.a) * 2; const t = 1 - p.life / p.max; m.fillStyle = `rgba(255, 214, 140, ${t * fade})`; m.beginPath(); m.arc(x, y, 1.6 * t + 0.4, 0, Math.PI * 2); m.fill(); }
    // éclair de lumière au début
    if (grand < 0.8) { m.fillStyle = `rgba(255, 236, 190, ${(0.8 - grand) * 0.5})`; m.fillRect(0, 0, innerWidth, innerHeight); }
    m.restore();
    if (grand > 9) { grand = -1; parts = []; go(0); }   // le livre se referme, les trois sceaux brillent sur la couverture
  })();

  /* ------------------------------------------------------------------ poussière dans la lumière des bougies */
  const dc = $('dust'), dg = dc.getContext('2d');
  let motes = [];
  function sizeDust() { dc.width = innerWidth; dc.height = innerHeight; motes = Array.from({ length: 70 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.6 + 0.3, vx: (Math.random() - 0.5) * 0.15, vy: -Math.random() * 0.2 - 0.03, p: Math.random() * 6 })); }
  addEventListener('resize', sizeDust); sizeDust();
  (function dust() {
    requestAnimationFrame(dust); dg.clearRect(0, 0, dc.width, dc.height);
    for (const d of motes) { d.x += d.vx + Math.sin(d.p += 0.01) * 0.1; d.y += d.vy; if (d.y < -5) { d.y = innerHeight + 5; d.x = Math.random() * innerWidth; } dg.fillStyle = `rgba(255, 210, 150, ${0.15 + 0.15 * Math.sin(d.p * 2)})`; dg.beginPath(); dg.arc(d.x, d.y, d.r, 0, Math.PI * 2); dg.fill(); }
  })();

  window.grimoire = { go, done };   // débogage
})();
