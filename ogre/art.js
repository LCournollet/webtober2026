/*
 * Les « photos » de l'annonce : des illustrations SVG originales (fan art), générées ici pour rester légères.
 * Chaque fonction reçoit un préfixe d'identifiants pour que plusieurs copies cohabitent dans la page.
 */

const svg = (vb, body, label) => `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const reeds = (x, y, n, h, c = '#4b6b2f') => Array.from({ length: n }, (_, i) => {
  const xx = x + i * 9 + (i % 2) * 3, hh = h * (0.7 + ((i * 37) % 10) / 30), lean = (i % 3 - 1) * 6;
  return `<path d="M${xx} ${y}q${lean / 2} ${-hh / 2} ${lean} ${-hh}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    (i % 2 ? `<rect x="${xx + lean - 3.5}" y="${y - hh - 4}" width="7" height="22" rx="3.5" fill="#6b4a2c"/>` : '');
}).join('');

const flies = (pts) => pts.map(([x, y], i) => `<g transform="translate(${x} ${y})"><ellipse cx="-3" cy="-4" rx="4" ry="2.5" fill="#fff" opacity=".7"/><ellipse cx="3" cy="-4" rx="4" ry="2.5" fill="#fff" opacity=".7"/><circle r="3" fill="#2a2a22"/><path d="M${-12 - i * 2} ${6}q-10 -8 -20 0" stroke="#2a2a22" stroke-width="1" stroke-dasharray="2 3" fill="none" opacity=".5"/></g>`).join('');

/** La souche aménagée, au petit matin. */
export function stump(p = 'a') {
  return svg('0 0 1200 800', `
  <defs>
    <linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d9a6"/><stop offset=".6" stop-color="#dfe4c0"/><stop offset="1" stop-color="#b9cfa4"/></linearGradient>
    <linearGradient id="${p}bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a4a2e"/><stop offset=".45" stop-color="#8f6740"/><stop offset="1" stop-color="#5a3d25"/></linearGradient>
    <linearGradient id="${p}pond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa77a"/><stop offset="1" stop-color="#55704a"/></linearGradient>
    <radialGradient id="${p}sun" cx=".72" cy=".18" r=".6"><stop offset="0" stop-color="#fff2c9" stop-opacity=".95"/><stop offset="1" stop-color="#fff2c9" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}win" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#f2b14e"/></radialGradient>
    <filter id="${p}blur"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="1200" height="800" fill="url(#${p}sky)"/>
  <rect width="1200" height="800" fill="url(#${p}sun)"/>
  <!-- forêt lointaine -->
  <path d="M0 430 Q60 330 120 420 Q170 300 230 410 Q300 290 360 400 Q420 320 480 410 Q560 300 620 400 Q700 320 760 410 Q840 290 900 400 Q980 320 1040 410 Q1110 300 1200 400 V520 H0Z" fill="#9db48a" opacity=".7"/>
  <path d="M0 470 Q80 380 150 460 Q220 360 290 455 Q380 370 440 460 Q520 380 600 465 Q690 370 760 460 Q850 380 920 465 Q1010 370 1080 460 Q1150 400 1200 450 V560 H0Z" fill="#7f9b6c"/>
  <g stroke="#e9e6d0" stroke-width="2" opacity=".5">${Array.from({ length: 6 }, (_, i) => `<path d="M${820 + i * 40} 0 L${600 + i * 70} 800" opacity="${0.25 + (i % 2) * 0.2}" stroke-width="${18 - i * 2}"/>`).join('')}</g>
  <ellipse cx="600" cy="500" rx="700" ry="40" fill="#fff" opacity=".35" filter="url(#${p}blur)"/>
  <!-- sol -->
  <path d="M0 540 Q300 500 600 530 T1200 520 V800 H0Z" fill="#6f8a45"/>
  <path d="M0 600 Q300 570 640 600 T1200 590 V800 H0Z" fill="#5d7a3a"/>
  <!-- mare -->
  <ellipse cx="840" cy="680" rx="330" ry="70" fill="url(#${p}pond)"/>
  <ellipse cx="760" cy="670" rx="120" ry="10" fill="#dfe8cf" opacity=".45"/>
  <g fill="#7fa04a"><ellipse cx="700" cy="690" rx="26" ry="9"/><ellipse cx="960" cy="700" rx="30" ry="10"/><ellipse cx="880" cy="660" rx="20" ry="7"/></g>
  <circle cx="962" cy="696" r="7" fill="#f3c6d4"/>
  <!-- la souche -->
  <g transform="translate(250 230)">
    <path d="M-40 360 Q-30 300 0 280 L10 40 Q20 0 160 0 Q300 0 310 40 L320 280 Q350 300 360 360 Q300 340 280 370 Q240 345 200 372 Q150 345 110 372 Q70 345 40 372 Q0 345 -40 360Z" fill="url(#${p}bark)"/>
    <ellipse cx="160" cy="22" rx="152" ry="34" fill="#c99b62"/>
    <ellipse cx="160" cy="22" rx="118" ry="24" fill="none" stroke="#a87c48" stroke-width="3"/>
    <ellipse cx="160" cy="22" rx="80" ry="15" fill="none" stroke="#a87c48" stroke-width="3"/>
    <ellipse cx="160" cy="22" rx="40" ry="7" fill="none" stroke="#a87c48" stroke-width="3"/>
    <g stroke="#4d3320" stroke-width="3" opacity=".55" fill="none">
      <path d="M40 60v210M75 70v120M250 60v200M285 80v150M200 230v90M110 240v80"/>
    </g>
    <path d="M10 40 Q40 70 30 120 Q60 90 70 60 Q110 80 120 40" fill="#7a9b3f" opacity=".85"/>
    <path d="M300 40 Q280 80 300 120 Q270 100 250 50" fill="#7a9b3f" opacity=".85"/>
    <!-- porte -->
    <path d="M115 360 V250 Q160 195 205 250 V360Z" fill="#4d3220"/>
    <path d="M122 355 V252 Q160 205 198 252 V355Z" fill="#6b4529"/>
    <g stroke="#4d3220" stroke-width="3"><path d="M147 225v130M173 225v130"/></g>
    <circle cx="190" cy="305" r="6" fill="#c9a46b"/>
    <!-- fenêtres -->
    <circle cx="62" cy="200" r="30" fill="#4d3220"/><circle cx="62" cy="200" r="24" fill="url(#${p}win)"/>
    <path d="M62 176v48M38 200h48" stroke="#4d3220" stroke-width="4"/>
    <circle cx="262" cy="160" r="26" fill="#4d3220"/><circle cx="262" cy="160" r="20" fill="url(#${p}win)"/>
    <path d="M262 140v40M242 160h40" stroke="#4d3220" stroke-width="4"/>
    <!-- cheminée -->
    <rect x="215" y="-70" width="34" height="90" fill="#5c5b55"/><rect x="209" y="-80" width="46" height="16" fill="#46453f"/>
    <g fill="#f4f1e6" opacity=".65"><circle cx="240" cy="-110" r="22"/><circle cx="262" cy="-150" r="28"/><circle cx="300" cy="-190" r="34"/><circle cx="350" cy="-215" r="26" opacity=".6"/></g>
  </g>
  <!-- les toilettes au fond du jardin -->
  <g transform="translate(960 300)">
    <path d="M-8 0 L60 -26 L128 0Z" fill="#5b3b23"/>
    <rect x="0" y="0" width="120" height="250" fill="#9a6a3f"/>
    <g stroke="#6e472a" stroke-width="3"><path d="M30 0v250M60 0v250M90 0v250"/></g>
    <rect x="18" y="40" width="84" height="200" rx="3" fill="#8a5c35" stroke="#5b3b23" stroke-width="4"/>
    <path d="M70 70a16 16 0 1 0 0 30a12 12 0 1 1 0-30z" fill="#2c1d12"/>
    <circle cx="90" cy="150" r="5" fill="#d8b46a"/>
    <path d="M-10 250h140" stroke="#4b6b2f" stroke-width="8"/>
  </g>
  ${flies([[1020, 330], [1060, 300]])}
  <!-- panneaux -->
  <g transform="translate(640 470) rotate(-4)">
    <rect x="-6" y="0" width="12" height="130" fill="#6b4529"/>
    <rect x="-90" y="-10" width="190" height="56" rx="6" fill="#a87a4a" stroke="#6b4529" stroke-width="4"/>
    <text x="5" y="16" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="20" fill="#7a1f12" font-weight="700">DÉFENSE</text>
    <text x="5" y="38" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="20" fill="#7a1f12" font-weight="700">D'ENTRER</text>
    <rect x="-70" y="56" width="150" height="38" rx="5" fill="#9b6d40" stroke="#6b4529" stroke-width="3" transform="rotate(6)"/>
    <text x="8" y="82" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="15" fill="#2c1d12" transform="rotate(6)">ATTENTION OGRE</text>
  </g>
  ${reeds(560, 640, 9, 120)}${reeds(1080, 650, 7, 110)}${reeds(40, 620, 8, 100)}
  `, 'La souche aménagée au petit matin, avec les toilettes au fond du jardin');
}

/** Les toilettes, de près. */
export function outhouse(p = 'b', { door = true } = {}) {
  return svg('0 0 800 800', `
  <defs>
    <linearGradient id="${p}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8d7a8"/><stop offset="1" stop-color="#7c9a5c"/></linearGradient>
    <linearGradient id="${p}wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b5d36"/><stop offset=".5" stop-color="#a8754a"/><stop offset="1" stop-color="#7c5130"/></linearGradient>
    <filter id="${p}soft"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect width="800" height="800" fill="url(#${p}bg)"/>
  <g filter="url(#${p}soft)" opacity=".8"><circle cx="120" cy="300" r="120" fill="#6e8f4e"/><circle cx="700" cy="260" r="140" fill="#64844a"/><circle cx="400" cy="200" r="90" fill="#a2b882"/></g>
  <path d="M0 640 Q400 600 800 640 V800 H0Z" fill="#5b7638"/>
  <g transform="translate(250 150)">
    <path d="M-30 0 L150 -60 L330 0Z" fill="#5b3b23"/><path d="M-30 0 L150 -60 L330 0" stroke="#3f2816" stroke-width="6" fill="none"/>
    <rect x="0" y="0" width="300" height="500" fill="url(#${p}wood)"/>
    <g stroke="#6a4325" stroke-width="4" opacity=".7"><path d="M60 0v500M120 0v500M180 0v500M240 0v500"/></g>
    ${door ? '' : '<rect x="40" y="70" width="220" height="420" rx="6" fill="#1a120b"/><rect x="70" y="330" width="160" height="40" rx="8" fill="#5b3b23"/>'}
    <g id="${p}door"${door ? '' : ' opacity="0"'}>
      <rect x="40" y="70" width="220" height="420" rx="6" fill="#94643b" stroke="#4f331d" stroke-width="7"/>
      <g stroke="#6a4325" stroke-width="3" opacity=".6"><path d="M95 72v416M150 72v416M205 72v416"/></g>
      <path d="M170 120a34 34 0 1 0 0 64a26 26 0 1 1 0-64z" fill="#2c1d12"/>
      <rect x="90" y="230" width="120" height="44" rx="6" fill="#c0392b" stroke="#7a1f12" stroke-width="3"/>
      <text x="150" y="260" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="22" fill="#fff">OCCUPÉ</text>
      <circle cx="235" cy="300" r="10" fill="#d8b46a"/>
    </g>
  </g>
  <!-- seau de « papier » -->
  <g transform="translate(590 560)">
    <path d="M0 0h100l-10 90H10z" fill="#9aa1a6" stroke="#5f666b" stroke-width="4"/>
    <path d="M10 0c-6-30 10-40 30-34-4-16 22-22 30-6 10-12 30-4 26 12" fill="#f4ecd6" stroke="#c9b98f" stroke-width="2"/>
    <text x="50" y="52" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="15" fill="#2c3236">CONTES</text>
  </g>
  ${flies([[300, 200], [520, 150], [470, 260]])}
  ${reeds(40, 700, 8, 140)}${reeds(690, 710, 9, 130)}
  `, 'Les toilettes au fond du jardin, porte fermée, panneau « Occupé »');
}

/** La chambre, dans la souche. */
export function bedroom(p = 'c') {
  return svg('0 0 800 800', `
  <defs>
    <radialGradient id="${p}glow" cx=".3" cy=".55" r=".7"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
    <linearGradient id="${p}wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3d25"/><stop offset=".5" stop-color="#7a5434"/><stop offset="1" stop-color="#4f3520"/></linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#${p}wall)"/>
  <g stroke="#3f2a18" stroke-width="3" opacity=".5" fill="none"><path d="M60 0 Q90 400 50 800M200 0 Q170 300 210 800M620 0 Q650 400 600 800M740 0 Q710 400 760 800"/></g>
  <circle cx="560" cy="210" r="80" fill="#2a3550"/><circle cx="560" cy="210" r="80" fill="none" stroke="#3f2a18" stroke-width="14"/>
  <circle cx="585" cy="190" r="26" fill="#f1ead2"/>
  <path d="M0 600 Q400 570 800 600 V800 H0Z" fill="#3f2a18"/>
  <ellipse cx="420" cy="690" rx="260" ry="50" fill="#6e8f3d" opacity=".9"/>
  <!-- lit -->
  <path d="M130 600h480v60H130z" fill="#6b4529"/>
  <path d="M120 520 Q370 470 620 520 L620 610 Q370 640 120 610Z" fill="#c9a050"/>
  <path d="M140 500 Q370 455 600 500 Q610 560 590 600 Q370 625 150 600 Q130 560 140 500Z" fill="#7a9b3f"/>
  <g fill="#5d7a2e" opacity=".9"><rect x="200" y="505" width="70" height="60" rx="6" transform="rotate(-6 235 535)"/><rect x="330" y="495" width="80" height="70" rx="6" fill="#8a5c35"/><rect x="450" y="505" width="70" height="60" rx="6" transform="rotate(5 485 535)"/></g>
  <g stroke="#3f2a18" stroke-width="2" stroke-dasharray="5 5" fill="none" opacity=".6"><rect x="200" y="505" width="70" height="60" rx="6" transform="rotate(-6 235 535)"/><rect x="330" y="495" width="80" height="70" rx="6"/></g>
  <ellipse cx="190" cy="500" rx="60" ry="26" fill="#efe3c2"/>
  <!-- bougie -->
  <rect x="660" y="560" width="70" height="40" rx="6" fill="#5a3d25"/>
  <rect x="686" y="510" width="18" height="52" fill="#f1ead2"/><path d="M695 488q12 14 0 24q-12-10 0-24z" fill="#ffcf5a"/>
  <rect width="800" height="800" fill="url(#${p}glow)"/>
  <!-- broderie -->
  <g transform="translate(270 140) rotate(-3)">
    <rect width="180" height="120" rx="6" fill="#efe3c2" stroke="#8a5c35" stroke-width="8"/>
    <text x="90" y="58" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="20" fill="#5d7a2e">Home</text>
    <text x="90" y="88" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="20" fill="#7a1f12">Sweet Boue</text>
  </g>
  `, 'La chambre : un lit de feuilles dans la souche, à la bougie');
}

/** Le « spa » : bain de boue. */
export function spa(p = 'd') {
  return svg('0 0 800 800', `
  <defs>
    <linearGradient id="${p}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e2b8"/><stop offset="1" stop-color="#8aa86a"/></linearGradient>
    <radialGradient id="${p}mud" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#9a7a4e"/><stop offset="1" stop-color="#5c4428"/></radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#${p}bg)"/>
  <g opacity=".5" fill="#6e8f4e"><circle cx="100" cy="200" r="110"/><circle cx="720" cy="160" r="130"/></g>
  <path d="M0 620 Q400 590 800 620 V800 H0Z" fill="#5d7a3a"/>
  <path d="M150 430 h500 l-30 230 h-440z" fill="#8a5c35"/>
  <g stroke="#5b3b23" stroke-width="4"><path d="M150 430h500M160 500h480M172 580h456"/></g>
  <ellipse cx="400" cy="432" rx="250" ry="46" fill="url(#${p}mud)"/>
  <g fill="#b0905e" opacity=".9"><circle cx="330" cy="420" r="14"/><circle cx="360" cy="440" r="8"/><circle cx="480" cy="425" r="11"/><circle cx="520" cy="440" r="6"/><circle cx="260" cy="438" r="7"/></g>
  <!-- grenouille -->
  <g transform="translate(600 392)"><ellipse cx="0" cy="20" rx="34" ry="22" fill="#6fa83a"/><circle cx="-14" cy="0" r="12" fill="#6fa83a"/><circle cx="14" cy="0" r="12" fill="#6fa83a"/><circle cx="-14" cy="-2" r="6" fill="#fff"/><circle cx="14" cy="-2" r="6" fill="#fff"/><circle cx="-13" cy="-1" r="3" fill="#222"/><circle cx="15" cy="-1" r="3" fill="#222"/><path d="M-12 18q12 8 24 0" stroke="#2f5a16" stroke-width="3" fill="none"/></g>
  <!-- bougies et panneau -->
  <g><rect x="110" y="580" width="20" height="50" fill="#f1ead2"/><path d="M120 560q10 12 0 20q-10-8 0-20z" fill="#ffcf5a"/><rect x="680" y="590" width="18" height="40" fill="#f1ead2"/><path d="M689 572q9 11 0 18q-9-7 0-18z" fill="#ffcf5a"/></g>
  <g transform="translate(330 200) rotate(-2)"><rect x="40" y="70" width="10" height="160" fill="#6b4529"/><rect x="-20" y="0" width="130" height="80" rx="8" fill="#a87a4a" stroke="#6b4529" stroke-width="5"/><text x="45" y="52" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="34" fill="#2c1d12">SPA</text></g>
  ${reeds(20, 690, 8, 150)}${reeds(700, 700, 9, 140)}
  `, 'Le spa : un bain de boue tiède, avec grenouille');
}

/** La vue, à la tombée de la nuit. */
export function view(p = 'e') {
  return svg('0 0 800 800', `
  <defs>
    <linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3a5a"/><stop offset=".6" stop-color="#5b6f78"/><stop offset="1" stop-color="#8e9a7a"/></linearGradient>
    <radialGradient id="${p}moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff7d8" stop-opacity="0"/></radialGradient>
    <filter id="${p}b"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="800" height="800" fill="url(#${p}sky)"/>
  <circle cx="560" cy="200" r="150" fill="url(#${p}moon)"/><circle cx="560" cy="200" r="52" fill="#f6f0d2"/>
  <path d="M0 500 Q120 420 220 480 Q330 400 440 470 Q560 410 660 470 Q740 430 800 460 V800 H0Z" fill="#3c4e45"/>
  <g stroke="#1f2a24" stroke-width="10" fill="none" stroke-linecap="round"><path d="M150 560 V360 M150 420 l-50 -40 M150 450 l40 -50"/><path d="M640 560 V380 M640 430 l40 -40 M640 470 l-46 -30"/></g>
  <ellipse cx="400" cy="560" rx="500" ry="50" fill="#dfe6e0" opacity=".45" filter="url(#${p}b)"/>
  <path d="M0 600 Q400 560 800 600 V800 H0Z" fill="#2f3f33"/>
  <ellipse cx="400" cy="680" rx="300" ry="50" fill="#465d5a"/><ellipse cx="520" cy="680" rx="60" ry="8" fill="#f6f0d2" opacity=".5"/>
  <g fill="#e8ff8a">${Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 137) % 800}" cy="${380 + ((i * 89) % 300)}" r="${2 + (i % 3)}" opacity="${0.4 + (i % 4) * 0.15}"/>`).join('')}</g>
  ${reeds(30, 720, 9, 160, '#1f2a24')}${reeds(680, 720, 9, 150, '#1f2a24')}
  `, 'La vue sur le marais à la nuit tombée, lune et lucioles');
}

/** L'hôte (fan art) : tête d'ogre vert, avec ses oreilles en trompette. */
export function ogreFace(p = 'f') {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="${p}s" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#b7d36a"/><stop offset="1" stop-color="#7fa23e"/></radialGradient></defs>
    <rect width="120" height="120" fill="#e9efd9"/>
    <path d="M12 46l-10-12c-3-4 2-9 6-6l14 10z" fill="#8fb04a"/><path d="M108 46l10-12c3-4-2-9-6-6l-14 10z" fill="#8fb04a"/>
    <ellipse cx="60" cy="66" rx="44" ry="46" fill="url(#${p}s)"/>
    <path d="M30 46q10-6 22-2M68 44q12-4 22 2" stroke="#3d4a1e" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="44" cy="56" r="5" fill="#2b2a1f"/><circle cx="76" cy="56" r="5" fill="#2b2a1f"/>
    <ellipse cx="60" cy="70" rx="9" ry="7" fill="#9cbd52"/>
    <path d="M40 90q20 10 40 0" stroke="#3d4a1e" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M0 120c8-14 30-18 60-18s52 4 60 18z" fill="#c8b07c"/><path d="M38 104l22 16 22-16" fill="#6b4529"/>
  </svg>`;
}

/** Plan du marais pour la section « Où se situe le logement ». */
export function map(p = 'g') {
  return svg('0 0 1000 420', `
  <rect width="1000" height="420" fill="#e8eedb"/>
  <path d="M0 260 Q200 200 380 250 T760 230 T1000 260 V420 H0Z" fill="#cfdcb4"/>
  <path d="M140 120 Q260 60 420 130 Q560 190 520 290 Q470 380 300 350 Q150 320 120 230 Q100 170 140 120Z" fill="#b6c99a"/>
  <path d="M600 90 Q700 60 780 110 Q840 160 800 220 Q740 270 660 230 Q590 190 600 90Z" fill="#9fc1c9"/>
  <path d="M-10 330 C200 300 300 380 520 340 S860 280 1010 320" stroke="#c9b48a" stroke-width="10" fill="none" stroke-dasharray="1 0"/>
  <path d="M-10 330 C200 300 300 380 520 340 S860 280 1010 320" stroke="#fffaf0" stroke-width="2" fill="none" stroke-dasharray="10 10"/>
  <g fill="#7f9b5f" opacity=".9">${Array.from({ length: 26 }, (_, i) => `<path d="M${60 + (i * 89) % 900} ${60 + (i * 53) % 220} l10 -22 l10 22z"/>`).join('')}</g>
  <text x="300" y="215" text-anchor="middle" font-family="'Rye',Georgia,serif" font-size="22" fill="#4b6b2f">Le Marais</text>
  <text x="700" y="165" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="16" fill="#3f6b78">Étang aux grenouilles</text>
  <text x="880" y="300" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="15" fill="#7a6a4a">→ Royaume de Fort Fort Lointain</text>
  <text x="90" y="300" font-family="Georgia,serif" font-style="italic" font-size="14" fill="#7a6a4a">Village (fourches et torches)</text>
  <g transform="translate(330 250)"><circle r="34" fill="#2f5d34" opacity=".15"/><path d="M0 0c-14-18-22-28-22-40a22 22 0 0 1 44 0c0 12-8 22-22 40z" fill="#2f5d34"/><circle cy="-40" r="9" fill="#fff"/></g>
  `, 'Plan du marais');
}

/** La porte seule (pour la visite virtuelle : elle s'ouvre par-dessus la cabane). */
export function door() {
  return `<svg viewBox="40 70 220 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="40" y="70" width="220" height="420" rx="6" fill="#94643b" stroke="#4f331d" stroke-width="7"/>
    <g stroke="#6a4325" stroke-width="3" opacity=".6"><path d="M95 72v416M150 72v416M205 72v416"/></g>
    <path d="M170 120a34 34 0 1 0 0 64a26 26 0 1 1 0-64z" fill="#2c1d12"/>
    <rect x="90" y="230" width="120" height="44" rx="6" fill="#c0392b" stroke="#7a1f12" stroke-width="3"/>
    <text x="150" y="260" text-anchor="middle" font-family="'Rye','Georgia',serif" font-size="22" fill="#fff">OCCUPÉ</text>
    <circle cx="235" cy="300" r="10" fill="#d8b46a"/>
  </svg>`;
}

/** L'hôte qui jaillit des toilettes, furieux, une page de conte à la main (fan art). */
export function ogreOut() {
  return `<svg viewBox="0 0 220 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="oo" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#b7d36a"/><stop offset="1" stop-color="#7a9d38"/></radialGradient></defs>
    <path d="M30 240c0-60 30-92 80-92s80 32 80 92z" fill="#e8dcc0"/>
    <path d="M60 240c0-50 18-80 50-82 32 2 50 32 50 82z" fill="#6b4a2c"/>
    <path d="M28 190 l-22-58 18-8 26 52z" fill="url(#oo)"/><path d="M192 190 l22-58-18-8-26 52z" fill="url(#oo)"/>
    <g transform="translate(176 108) rotate(14)"><rect x="-4" y="-36" width="42" height="54" rx="2" fill="#f4ecd6" stroke="#c9b98f" stroke-width="2"/><path d="M2-26h30M2-18h30M2-10h22" stroke="#b9a77c" stroke-width="2"/><text x="17" y="10" text-anchor="middle" font-size="7" font-family="Georgia,serif" fill="#7a1f12">Il était une fois</text></g>
    <path d="M38 76l-22-20c-4-4 2-10 7-7l24 14z" fill="#8fb04a"/><path d="M182 76l22-20c4-4-2-10-7-7l-24 14z" fill="#8fb04a"/>
    <ellipse cx="110" cy="92" rx="66" ry="64" fill="url(#oo)"/>
    <path d="M66 66l30 12M154 66l-30 12" stroke="#3d4a1e" stroke-width="7" stroke-linecap="round"/>
    <circle cx="86" cy="84" r="6" fill="#2b2a1f"/><circle cx="134" cy="84" r="6" fill="#2b2a1f"/>
    <ellipse cx="110" cy="100" rx="12" ry="9" fill="#9cbd52"/>
    <path d="M76 126q34-26 68 0q-34 18-68 0z" fill="#3a1d16"/><path d="M84 124l6 8 6-8M124 124l6 8 6-8" fill="#f4f1e6"/>
  </svg>`;
}
