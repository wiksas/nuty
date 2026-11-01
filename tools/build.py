"""Skanuje img/*.pdf, robi miniatury (thumbs/*.webp) i generuje nuty.js.

Uruchom po dodaniu / usunięciu PDF-a:   python tools/build.py
Tytuł i kategorię nuty ustawiasz w tools/meta.json (brak wpisu = tytuł z nazwy pliku).
Wymaga:  pip install pymupdf pillow
"""
import io
import json
import re
import unicodedata
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "img"
THUMBS = ROOT / "thumbs"
THUMB_WIDTH = 560

meta = json.loads((ROOT / "tools" / "meta.json").read_text(encoding="utf-8"))
ignore = set(meta.get("ignore", []))
default_tag = meta.get("default_tag", "Pozostałe")
default_theme = meta.get("default_theme", "default")
tag_order = meta.get("tag_order", [])
pieces = meta.get("pieces", {})


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def pretty(stem: str) -> str:
    return re.sub(r"[-_]+", " ", stem).strip().capitalize()


def make_thumb(pdf: Path, out: Path) -> int:
    with pymupdf.open(pdf) as doc:
        page = doc[0]
        zoom = THUMB_WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        Image.open(io.BytesIO(pix.tobytes("png"))).save(out, "WEBP", quality=82, method=6)
        return doc.page_count


THUMBS.mkdir(exist_ok=True)
items = []
used = set()
for pdf in sorted(IMG.glob("*.pdf"), key=lambda p: p.name.lower()):
    if pdf.name in ignore:
        continue
    m = pieces.get(pdf.name, {})
    sl = slug(pdf.stem)
    thumb = THUMBS / f"{sl}.webp"
    used.add(thumb.name)
    if thumb.exists() and thumb.stat().st_mtime >= pdf.stat().st_mtime:
        with pymupdf.open(pdf) as doc:
            pages = doc.page_count
    else:
        pages = make_thumb(pdf, thumb)
    items.append({
        "id": sl,
        "file": f"img/{pdf.name}",
        "title": m.get("title") or pretty(pdf.stem),
        "tag": m.get("tag", default_tag),
        "theme": m.get("theme", default_theme),
        "pages": pages,
        "thumb": f"thumbs/{thumb.name}",
    })

for old in THUMBS.glob("*.webp"):
    if old.name not in used:
        old.unlink()

rank = {t: i for i, t in enumerate(tag_order)}
items.sort(key=lambda x: x["title"].lower())

(ROOT / "nuty.js").write_text(
    "// Plik generowany przez tools/build.py - nie edytuj ręcznie.\n"
    "window.NUTY = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n"
    "window.NUTY_TAGS = " + json.dumps(
        sorted({i["tag"] for i in items}, key=lambda t: rank.get(t, 99)), ensure_ascii=False
    ) + ";\n",
    encoding="utf-8",
)
print(f"OK: {len(items)} nut, miniatury w {THUMBS.name}/")
