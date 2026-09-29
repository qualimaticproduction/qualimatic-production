#!/usr/bin/env python3
"""
Prépare la « salle de projection » à partir de la vidéo générée (plan-séquence façade → écran).

Produit, dans livraison/cinema/ :
  - frames/0000.webp … : la vidéo découpée en images (12 i/s) pour le scroll
  - scene.json         : les repères suivis image par image (vitrines d'affiche,
                         marquise, écran) + le cadrage conseillé pour les écrans étroits

Usage :
  pip install pillow numpy scipy imageio-ffmpeg
  python3 outils/cinema/preparer_scene.py cinema-16x9.mp4

À relancer uniquement si la vidéo de la salle change. Les pages clients
(livraison/<couple>/) réutilisent toutes la même scène.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.signal import savgol_filter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "livraison" / "cinema"
FPS = 12            # images par seconde gardées pour le scroll
OUT_W = 1440        # largeur des images publiées
QUALITY = 62        # qualité WebP


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


def extract(video, tmp):
    subprocess.run([ffmpeg_exe(), "-loglevel", "error", "-y", "-i", str(video),
                    "-vf", f"fps={FPS}", str(tmp / "f%04d.png")], check=True)
    return sorted(tmp.glob("f*.png"))


def luminance(img):
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def components(L, th, min_area):
    lab, _ = ndi.label(L > th)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        area = int((lab[sl] == i + 1).sum())
        if area >= min_area:
            out.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, area=area,
                            fill=area / ((x1 - x0) * (y1 - y0))))
    return out


def unclip(b, aspect, W, H):
    """Reconstitue un rectangle partiellement hors champ grâce à son ratio connu (l/h)."""
    x0, y0, x1, y1 = b["x0"], b["y0"], b["x1"], b["y1"]
    w, h = x1 - x0, y1 - y0
    if x0 <= 0 and x1 < W:
        x0 = x1 - aspect * h
    elif x1 >= W and x0 > 0:
        x1 = x0 + aspect * h
    if y0 <= 0 and y1 < H:
        y0 = y1 - (x1 - x0) / aspect
    elif y1 >= H and y0 > 0:
        y1 = y0 + (x1 - x0) / aspect
    return [x0, y0, x1 - x0, y1 - y0], w * h


def nearest(cands, prev):
    px, py = prev[0] + prev[2] / 2, prev[1] + prev[3] / 2
    return min(cands, key=lambda b: ((b["x0"] + b["x1"]) / 2 - px) ** 2 + ((b["y0"] + b["y1"]) / 2 - py) ** 2)


def smooth(rects, extend=0):
    a = np.array(rects, dtype=np.float64)
    if len(a) >= 9:
        a = savgol_filter(a, 9, 2, axis=0)
    # Prolonge le mouvement quelques images après la dernière détection,
    # le temps que l'objet finisse de sortir du champ
    for _ in range(extend):
        a = np.vstack([a, a[-1] + (a[-1] - a[-2])])
    return a


def track_posters(Ls, W, H):
    """Les deux vitrines d'affiche : rectangles clairs, verticaux, très pleins."""
    first = [b for b in components(Ls[0], 200, 800)
             if 1.5 < (b["y1"] - b["y0"]) / (b["x1"] - b["x0"]) < 2.2 and b["fill"] > 0.95]
    first.sort(key=lambda b: b["x0"])
    assert len(first) == 2, f"vitrines introuvables : {first}"
    tracks = []
    for seed in first:
        aspect = (seed["x1"] - seed["x0"]) / (seed["y1"] - seed["y0"])
        prev = [seed["x0"], seed["y0"], seed["x1"] - seed["x0"], seed["y1"] - seed["y0"]]
        rects = []
        for L in Ls:
            cands = [b for b in components(L, 200, 400) if b["fill"] > 0.9]
            if not cands:
                break
            b = nearest(cands, prev)
            rect, visible = unclip(b, aspect, W, H)
            # Arrêt quand la vitrine sort du champ ou que la détection décroche
            if visible < 0.06 * rect[2] * rect[3] or abs(rect[3] - prev[3]) > 0.2 * prev[3]:
                break
            rects.append(rect)
            prev = rect
        tracks.append(rects)
    return tracks


def track_marquee(Ls, W, H):
    """La marquise : trois bandes blanches horizontales empilées (tableau à lettres)."""
    rects, aspect = [], None
    for L in Ls:
        rows = [b for b in components(L, 200, 800)
                if (b["x1"] - b["x0"]) > 8 * (b["y1"] - b["y0"]) and b["fill"] > 0.8
                and (b["x1"] - b["x0"]) > 0.35 * W]
        if not rows:
            break
        rows.sort(key=lambda b: b["y0"])
        rows = rows[:3]
        x0, x1 = min(r["x0"] for r in rows), max(r["x1"] for r in rows)
        y0, y1 = min(r["y0"] for r in rows), max(r["y1"] for r in rows)
        if aspect is None:
            if len(rows) < 3:
                break
            aspect = (x1 - x0) / (y1 - y0)
        # Le bas et la largeur restent visibles jusqu'au bout : on en déduit le haut
        h = (x1 - x0) / aspect
        rects.append([x0, y1 - h, x1 - x0, h])
    return rects


def track_screen(Ls, W, H):
    """L'écran, une fois le rideau entièrement ouvert (grand rectangle clair et plein)."""
    start, rects = None, []
    for i, L in enumerate(Ls):
        big = [b for b in components(L, 200, 5000) if b["fill"] > 0.97
               and (b["x1"] - b["x0"]) * (b["y1"] - b["y0"]) > 0.12 * W * H]
        if not big:
            if start is not None:
                break
            continue
        b = max(big, key=lambda b: b["area"])
        if start is None:
            start = i
        rects.append([b["x0"], b["y0"], b["x1"] - b["x0"], b["y1"] - b["y0"]])
    return start, rects


def norm(rects, W, H, nd=4):
    return [[round(r[0] / W, nd), round(r[1] / H, nd), round(r[2] / W, nd), round(r[3] / H, nd)] for r in rects]


def main():
    video = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "cinema-16x9.mp4")
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        pngs = extract(video, tmp)
        print(f"{len(pngs)} images extraites à {FPS} i/s")
        full_w, full_h = Image.open(pngs[0]).size
        # Analyse en demi-résolution : assez précis, et 4× moins de mémoire
        W, H = full_w // 2, full_h // 2
        Ls = [luminance(Image.open(p).resize((W, H), Image.BILINEAR)) for p in pngs]

        posters = track_posters(Ls, W, H)
        marquee = track_marquee(Ls, W, H)
        s_start, screen = track_screen(Ls, W, H)
        print(f"vitrines : {[len(p) for p in posters]} images · marquise : {len(marquee)} · "
              f"écran : dès l'image {s_start} ({len(screen)} images)")

        frames = OUT / "frames"
        frames.mkdir(parents=True, exist_ok=True)
        for old in frames.glob("*.webp"):
            old.unlink()
        out_h = round(full_h * OUT_W / full_w / 2) * 2
        for i, p in enumerate(pngs):
            Image.open(p).convert("RGB").resize((OUT_W, out_h), Image.LANCZOS).save(
                frames / f"{i:04d}.webp", "WEBP", quality=QUALITY, method=6)

    n = len(pngs)
    scr = smooth(screen)
    # Cadrage conseillé pour les écrans étroits (téléphone) : la zone à garder visible.
    # [image, x, y, l, h] en coordonnées relatives ; entre deux repères on interpole.
    last = scr[-1]
    roi = [
        [0,   0.245, 0.05, 0.51, 0.62],   # façade : marquise et les deux vitrines
        [40,  0.20, 0.10, 0.60, 0.62],    # approche de l'entrée
        [70,  0.30, 0.15, 0.40, 0.60],    # passage des portes, hall
        [150, 0.32, 0.10, 0.36, 0.65],    # salle, rideau fermé
        [s_start] + [round(v, 4) for v in (scr[0] / [W, H, W, H]).tolist()],
        [n - 1] + [round(v, 4) for v in (last / [W, H, W, H]).tolist()],
    ]
    scene = {
        "w": full_w, "h": full_h, "fps": FPS, "count": n,
        "frames": "frames/", "ext": "webp", "pad": 4,
        "tracks": {
            "posterL": {"from": 0, "rects": norm(smooth(posters[0], 4), W, H)},
            "posterR": {"from": 0, "rects": norm(smooth(posters[1], 4), W, H)},
            "marquee": {"from": 0, "rects": norm(smooth(marquee, 3), W, H)},
            "screen": {"from": s_start, "rects": norm(scr, W, H)},
        },
        "roi": roi,
    }
    (OUT / "scene.json").write_text(json.dumps(scene, separators=(",", ":")))
    print(f"scene.json écrit · {n} images dans {frames.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
