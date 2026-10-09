"""
Découpe le portrait source en fragments triangulaires pour l'anamorphose.

    python tools/bake.py                      # utilise source/faker.webp
    python tools/bake.py source/autre.jpg     # autre image (adapter SILHOUETTE et ZONES ci-dessous)

Sortie : public/portrait.json — uniquement des triangles 2D (coordonnées normalisées) et leurs couleurs.
La photo elle-même n'est jamais publiée : le site ne contient que ces fragments.

Principe : on échantillonne des points plus serrés là où le visage a des détails (contours, yeux, lunettes,
nez, bouche, doigt), on les triangule (Delaunay), et chaque triangle prend la couleur moyenne de sa zone.
"""
import json, sys, random
import cv2
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else 'source/faker.webp'
OUT = 'public/portrait.json'
TARGET_POINTS = 640          # points « libres » ; + ~200 points posés sur les contours fins → ~1 600 triangles
random.seed(9); np.random.seed(9)

# silhouette (pixels de l'image source) : tête, cheveux, cou, main et doigt — pas le maillot
SILHOUETTE = [(447,150),(441,95),(458,45),(500,12),(560,2),(620,4),(668,30),(690,75),(693,130),(697,160),(694,205),(682,232),(668,268),(652,300),(645,330),(650,360),(655,410),(690,422),(704,455),(600,462),(560,452),(530,440),(510,400),(507,345),(520,322),(505,300),(488,270),(474,232),(466,200),(455,175)]
# zones importantes (ellipses cx, cy, rx, ry, poids) : plus de fragments, plus petits
ZONES = [
    (533, 172, 62, 34, 1.0),   # œil + verre gauche
    (626, 170, 58, 32, 1.0),   # œil + verre droit
    (582, 205, 26, 40, 0.7),   # nez
    (585, 262, 48, 22, 0.9),   # bouche
    (586, 285, 22, 62, 1.0),   # doigt « chut »
    (572, 380, 70, 60, 0.6),   # main
    (575, 100, 120, 70, 0.35), # mèches de cheveux
]

img = cv2.imread(SRC)
H, W = img.shape[:2]
poly = np.array(SILHOUETTE, np.int32)
mask = np.zeros((H, W), np.uint8); cv2.fillPoly(mask, [poly], 255)
x0, y0, bw, bh = cv2.boundingRect(poly)

# carte d'importance : contours (Canny lissé) + zones du visage
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0), 40, 110).astype(np.float32) / 255
edges = cv2.GaussianBlur(edges, (0, 0), 3.0); edges /= edges.max() + 1e-6
zones = np.zeros((H, W), np.float32)
yy, xx = np.mgrid[0:H, 0:W]
for cx, cy, rx, ry, w in ZONES:
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    zones = np.maximum(zones, w * np.clip(1.3 - d, 0, 1))
imp = np.clip(0.12 + 0.55 * edges + 0.75 * zones, 0, 1) * (mask > 0)

# échantillonnage : disque de Poisson à rayon variable (serré là où c'est important)
pts = []
grid = {}
CELL = 4
def free(x, y, r):
    gx, gy = int(x // CELL), int(y // CELL); k = int(r // CELL) + 1
    for i in range(gx - k, gx + k + 1):
        for j in range(gy - k, gy + k + 1):
            for (px, py) in grid.get((i, j), ()):
                if (px - x) ** 2 + (py - y) ** 2 < r * r: return False
    return True
def add(x, y):
    pts.append((x, y)); grid.setdefault((int(x // CELL), int(y // CELL)), []).append((x, y))

# contour de la silhouette d'abord (bords nets)
per = cv2.arcLength(poly, True)
for t in np.linspace(0, 1, int(per / 9), endpoint=False):
    d = t * per; acc = 0
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; L = float(np.hypot(*(b - a)))
        if acc + L >= d:
            k = (d - acc) / L; x, y = a + (b - a) * k
            if free(x, y, 5): add(float(x), float(y))
            break
        acc += L
# contours fins (monture des lunettes, paupières, lèvres, doigt) : des points posés exactement dessus,
# pour que les arêtes des triangles suivent ces lignes au lieu de les brouiller
fine = cv2.Canny(gray, 50, 130)
ey, ex = np.nonzero((fine > 0) & (zones > 0.35) & (mask > 0))
order = np.random.permutation(len(ex))
n_edge = 0
for k in order:
    x, y = float(ex[k]), float(ey[k])
    if free(x, y, 4.6): add(x, y); n_edge += 1
    if n_edge >= 230: break
print('points sur contours :', n_edge)
tries = 0
while len(pts) < TARGET_POINTS + n_edge and tries < 400000:
    tries += 1
    x = random.uniform(x0, x0 + bw); y = random.uniform(y0, y0 + bh)
    v = imp[int(y), int(x)]
    if v <= 0 or random.random() > 0.15 + v: continue
    r = 4.2 + (1 - v) ** 1.6 * 15
    if free(x, y, r): add(x, y)
print('points :', len(pts))

# triangulation de Delaunay, on garde les triangles dans la silhouette
sub = cv2.Subdiv2D((x0 - 2, y0 - 2, bw + 4, bh + 4))
for p in pts: sub.insert((float(p[0]), float(p[1])))
soft = cv2.GaussianBlur(img, (0, 0), 1.2).astype(np.float32)
tris = []
for t in sub.getTriangleList():
    a, b, c = (t[0], t[1]), (t[2], t[3]), (t[4], t[5])
    cx, cy = (a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3
    if not (x0 <= cx < x0 + bw and y0 <= cy < y0 + bh) or mask[int(cy), int(cx)] == 0: continue
    tm = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(tm, np.array([a, b, c], np.int32), 1)
    sel = (tm > 0) & (mask > 0)
    if sel.sum() == 0: continue
    col = img[sel].mean(axis=0)[::-1]   # BGR -> RGB
    # chaque sommet prend la couleur de l'image (légèrement floutée) un peu à l'intérieur du triangle, mêlée à la moyenne
    vc = []
    for (x, y) in (a, b, c):
        ix, iy = x + (cx - x) * 0.25, y + (cy - y) * 0.25
        vc.append(0.65 * soft[int(iy), int(ix)][::-1] + 0.35 * col)
    tris.append(((a, b, c), vc, float(imp[int(cy), int(cx)])))
print('triangles :', len(tris))

# coordonnées normalisées : hauteur de la silhouette = 2 unités, centrée
cx0, cy0, s = x0 + bw / 2, y0 + bh / 2, bh / 2
flat, cols, imps = [], [], []
for (a, b, c), col, v in tris:
    for (x, y) in (a, b, c): flat += [round(float(x - cx0) / s, 4), round(-float(y - cy0) / s, 4)]
    cols.append(''.join('%02x%02x%02x' % tuple(int(round(min(255, max(0, k)))) for k in vcol) for vcol in col))
    imps.append(round(v, 2))
json.dump({ 'aspect': round(bw / bh, 4), 'tris': flat, 'colors': cols, 'detail': imps }, open(OUT, 'w'), separators=(',', ':'))
print('écrit', OUT)

# aperçu à plat, pour contrôle
prev = np.full((bh, bw, 3), 8, np.float32)
for (a, b, c), col, v in tris:
    P = np.array([a, b, c], np.float32) - (x0, y0); C = np.array(col, np.float32)[:, ::-1]
    xa, ya = np.floor(P.min(0)).astype(int); xb, yb = np.ceil(P.max(0)).astype(int)
    gx, gy = np.meshgrid(np.arange(xa, xb + 1), np.arange(ya, yb + 1))
    v0, v1 = P[1] - P[0], P[2] - P[0]; den = v0[0] * v1[1] - v1[0] * v0[1]
    if abs(den) < 1e-6: continue
    wx, wy = gx + .5 - P[0][0], gy + .5 - P[0][1]
    l1 = (wx * v1[1] - v1[0] * wy) / den; l2 = (v0[0] * wy - wx * v0[1]) / den; l0 = 1 - l1 - l2
    m = (l0 >= -.01) & (l1 >= -.01) & (l2 >= -.01) & (gx >= 0) & (gy >= 0) & (gx < bw) & (gy < bh)
    prev[gy[m], gx[m]] = l0[m, None] * C[0] + l1[m, None] * C[1] + l2[m, None] * C[2]
cv2.imwrite('source/_preview.png', np.clip(prev, 0, 255).astype(np.uint8))
