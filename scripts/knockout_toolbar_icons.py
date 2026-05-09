#!/usr/bin/env python3
"""
Remove checkerboard / solid backgrounds from share & save PNGs.

The old near-white threshold left light gray (e.g. 204,204,204) cells.  We now
flood the exterior from the image border through every pixel that is not
‘ink’ (dark stroke), with a dilated ink mask so anti-aliased edges don’t leak.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def _lum(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def knockout_edge_flood(
    im: Image.Image,
    ink_lum: float = 100.0,
    dilate: int = 5,
) -> Image.Image:
    """
    Pixels darker than `ink_lum` are treated as icon ink (blocking).  Everything
    4-connected to the border through non-ink space becomes transparent.
    """
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    ink = Image.new("L", (w, h), 0)
    ip = ink.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 12:
                # Already empty — not part of the ink wall
                ip[x, y] = 0
            else:
                ip[x, y] = 255 if _lum(r, g, b) < ink_lum else 0

    if dilate > 1:
        ink = ink.filter(ImageFilter.MaxFilter(dilate))
    wall = ink.load()

    vis = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not vis[y][x] and wall[x, y] == 0:
            vis[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not vis[ny][nx] and wall[nx, ny] == 0:
                vis[ny][nx] = True
                q.append((nx, ny))

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            if vis[y][x]:
                op[x, y] = (0, 0, 0, 0)
            else:
                op[x, y] = px[x, y]

    # Enclosed “islands” of checkerboard (inside closed strokes) never see the border
    strip_light_gray_blobs(out, lum_floor=145.0, chroma_max=36)
    return out


def strip_light_gray_blobs(
    im: Image.Image,
    lum_floor: float = 145.0,
    chroma_max: float = 36.0,
) -> None:
    """Turn light neutral pixels (checker / paper) transparent — glyphs stay dark."""
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            chroma = max(r, g, b) - min(r, g)
            if chroma > chroma_max:
                continue
            if _lum(r, g, b) >= lum_floor:
                px[x, y] = (0, 0, 0, 0)


def invert_rgb_keep_alpha(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    r, g, b, a = im.split()
    r = Image.eval(r, lambda i: 255 - i)
    g = Image.eval(g, lambda i: 255 - i)
    b = Image.eval(b, lambda i: 255 - i)
    return Image.merge("RGBA", (r, g, b, a))


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    icons = root / "assets" / "icons"
    share = icons / "share_icon.png"
    save = icons / "save_article.png"
    if share.exists():
        k = knockout_edge_flood(Image.open(share))
        k.save(share, optimize=True)
        invert_rgb_keep_alpha(k).save(icons / "share_icon_dark.png", optimize=True)
        print("Updated", share, "and share_icon_dark.png")
    if save.exists():
        k = knockout_edge_flood(Image.open(save))
        k.save(save, optimize=True)
        invert_rgb_keep_alpha(k).save(icons / "save_article_dark.png", optimize=True)
        print("Updated", save, "and save_article_dark.png")

    remove_bm = icons / "remove_bookmark.png"
    if remove_bm.exists():
        k = knockout_edge_flood(Image.open(remove_bm))
        k.save(remove_bm, optimize=True)
        invert_rgb_keep_alpha(k).save(icons / "remove_bookmark_dark.png", optimize=True)
        print("Updated", remove_bm, "and remove_bookmark_dark.png")

    legacy = root / "icons"
    for name in [
        "share_icon.png",
        "share_icon_dark.png",
        "save_article.png",
        "save_article_dark.png",
        "remove_bookmark.png",
        "remove_bookmark_dark.png",
    ]:
        src = icons / name
        if src.exists():
            dst = legacy / name
            dst.write_bytes(src.read_bytes())
            print("Mirrored to", dst)


if __name__ == "__main__":
    main()
