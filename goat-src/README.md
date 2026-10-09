# G.O.A.T. — anamorphose 3D (Devtober 09 · Bélier → GOAT)

Des ~1 600 fragments triangulaires flottent à des profondeurs différentes. Depuis un seul point de vue
(la caméra de référence), leurs projections se recollent et forment le portrait ; ailleurs, c'est une sculpture abstraite.
Rien ne bouge quand la caméra tourne : seule la perspective fait l'image.

```bash
npm install
npm run dev      # développement
npm run build    # → ../goat
```

## Changer l'image

1. Déposer la photo dans `source/` (ce dossier n'est jamais publié ni commité).
2. Dans `tools/bake.py`, ajuster `SILHOUETTE` (polygone en pixels autour de la tête/main) et `ZONES` (yeux, bouche… plus détaillés).
3. `python tools/bake.py source/ma-photo.jpg` → génère `public/portrait.json` et un aperçu `source/_preview.png`.

Seul `portrait.json` (triangles + couleurs) part en ligne : la photo d'origine n'est pas distribuée.

## Comment marche l'anamorphose

Œil de référence en E = (0, 0, D). Un point (x, y) du portrait, poussé à la profondeur z le long du rayon qui part de E,
devient P = (x·(D−z)/D, y·(D−z)/D, z) : vu de E il retombe exactement à sa place. Les profondeurs suivent surtout
un champ lisse (le portrait se déforme puis se recompose en douceur quand on approche de l'angle) + un peu de hasard.

Un seul `BufferGeometry` non indexé, couleurs par sommet, un shader minimal : **un seul appel de dessin**.
