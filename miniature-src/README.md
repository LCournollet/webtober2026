# Ode à la vie — Devtober 03 · « Miniature »

Une courte œuvre interactive contemplative : un homme attend sous un lampadaire, sous la pluie.
Chaque geste de scroll fait plonger d'une échelle — la goutte, la vie microscopique, les molécules d'eau,
l'atome — puis un dernier geste fait tout remonter d'un coup, jusqu'à la rue où presque aucun temps ne s'est écoulé.

```bash
npm install
npm run dev      # développement
npm run build    # → ../miniature (servi sur /miniature)
```

Three.js · TypeScript · Vite · GSAP · WebAudio (son 100 % procédural, aucun fichier audio).

## 1. Le concept

L'expérience repose sur une seule promesse : **le même instant, vu de plus en plus près**.
Le temps se fige dès qu'on quitte la rue (la pluie devient des perles immobiles), donc chaque échelle est un
arrêt sur image dans lequel on peut flotter. Ce qui compte, par ordre de priorité : l'atmosphère, la qualité
des transitions, la composition de chaque plan, puis les interactions, et enfin l'exactitude scientifique
(qui est respectée quand elle ne coûte rien : géométrie réelle de H₂O, orbitales 1s/2s/2p tirées de leur densité de probabilité).

Palette commune à toutes les échelles : bleu nuit, gris-bleu, jaune chaud du lampadaire. Le lampadaire est
le fil conducteur : sa lumière devient le reflet dans la goutte, puis les rayons dans l'eau, puis la teinte
des oxygènes, puis la lueur du noyau.

## 2. Architecture

```
src/
  core/        Experience (chef d'orchestre), Renderer (+ post-process), SceneManager (chargement paresseux),
               TransitionManager (les plongées), Input (scroll = bouton), types (ExperienceScene, Look)
  scenes/      BaseScene (caméra orbitale douce) + une classe par échelle : street, droplet, micro, molecule, atom
  shaders/     final.ts (passe finale), translucent.ts (organismes)
  audio/       AudioEngine (pluie, vent, ville, eau, bulles, drone, scintillement, réverbération)
  ui/          Narration (texte), Chrome (points de progression, indice, rideau), style.css
  utils/       maths, textures générées au canvas
```

Chaque échelle implémente `ExperienceScene` : `enter / intro / outro / exit / update / pointer / resize / dispose`,
plus un `Look` (exposition, bloom, teinte, vignette, grain) et une `maskColor`.
Un seul renderer et un seul composer : seule la scène affichée est rendue. Les scènes sont importées
dynamiquement (un chunk par échelle) et préchargées pendant qu'on regarde la précédente.

`goToLevel(n)` verrouille les entrées pendant toute la transition ; le scroll est accumulé puis converti en
un seul pas, l'inertie des pavés tactiles est ignorée.

## 3. Les scènes

| Niveau | Scène | Ce qu'on voit |
|---|---|---|
| 0 | Rue | Lampadaire, homme à l'écharpe ocre sous son parapluie, sol mouillé, voitures floues au loin. La pluie n'existe que dans le cône de lumière. |
| 1 | Goutte | Une sphère d'eau (IOR 1,333) qui réfracte la ville floue, ondule à peine, contient des micro-bulles. |
| 2 | Vie microscopique | Volvox, diatomées, paramécie (cils animés), radiolaire, bactéries — translucides, dans des rayons de lumière et de la neige marine. |
| 3 | Molécules | Une grappe d'eau liquide, liaisons hydrogène en pointillés qui naissent et meurent, des milliers de molécules dans la brume. |
| 4 | Atome | Noyau minuscule (8 p + 8 n) et nuages de probabilité qui scintillent — surtout du vide. |
| 5 | Retour | Montage éclair atome → molécule → vie → goutte → rue, la goutte finit sa chute et éclate au sol. Silence, puis « There is no such thing as ordinary. » |

## 4. L'illusion d'échelle

Il n'y a pas de monde continu de 10⁻¹⁰ à 10¹ mètres : chaque échelle est une scène indépendante, dans ses
propres unités (mètres, millimètres, micromètres, ångströms). L'illusion vient de la transition :

1. **outro** — la caméra fonce vers un objet précis (la goutte, une cellule, une molécule, un noyau) et
   rétrécit son champ ; l'objet remplit l'écran.
2. **masque** — la passe finale ajoute un flou radial dans le sens du mouvement, un flou de profondeur et
   un fondu vers la `maskColor` de l'objet (l'eau éclairée, le bleu profond, la lueur de l'atome…).
   Écran masqué ⇒ on échange les scènes.
3. **intro** — la nouvelle scène part d'une caméra collée à l'équivalent de l'objet et recule largement.

Le cerveau raccorde « ce que je fixais » à « ce dont je sors » : on a l'impression d'être entré dedans.
En remontant, c'est la même chose à l'envers. Le gel du temps (vitesse 0 dès la goutte) renforce l'idée
qu'on regarde un seul instant.

## 5. Shaders vs. simple

- **Shaders maison** : pluie (visible seulement dans le cône, longueur de traînée = vitesse du temps),
  cône de lumière volumétrique, reflet étiré au sol, ondulation de la goutte, matériaux translucides
  (Fresnel) des organismes, cils, neige marine, liaisons H, nuages électroniques (tremblement quantique),
  passe finale (flou Vogel, flou radial, fondu, chromatisme, vignette, grain).
- **Matériaux Three.js standards** : rue, homme, parapluie, lampadaire, atomes des molécules
  (instanciés), goutte (MeshPhysicalMaterial avec transmission).
- **Performance** : instancing partout où il y a du nombre, qualité « low » automatique (moins de
  particules, pixel ratio 1, bloom demi-résolution) et dégradation à la volée si une image dépasse ~24 ms.

## Contrôles

Scroll / ↓ / espace : plonger · ↑ : remonter · souris : regarder autour · glisser : tourner · 🔈 : son.
