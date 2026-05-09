#!/usr/bin/env python3
"""Extract clean outline PNGs from stock reference images (checkerboard + watermark)."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return 0.299 * r + 0.587 * g + 0.114 * b


def _dilated_wall_mask(a_only: Image.Image, threshold: int = 72, dilate: int = 5) -> Image.Image:
    """Solid ink + dilation so tiny gaps in outlines don’t leak flood-fill."""
    w, h = a_only.size
    wall = Image.new("L", (w, h))
    wp = wall.load()
    ap = a_only.load()
    for y in range(h):
        for x in range(w):
            wp[x, y] = 255 if ap[x, y] > threshold else 0
    if dilate > 1:
        wall = wall.filter(ImageFilter.MaxFilter(dilate))
    return wall


def fill_enclosed_interiors(rgba: Image.Image, interior: tuple[int, int, int, int]) -> Image.Image:
    """
    Flood exterior from image edges through non-ink pixels; sealed pockets become
    `interior` RGBA (Nepali moon = black fill, sun = white fill).
    """
    w, h = rgba.size
    alpha = rgba.split()[3]
    wall = _dilated_wall_mask(alpha, threshold=72, dilate=5)
    wp = wall.load()

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not visited[y][x] and wp[x, y] == 0:
            visited[y][x] = True
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
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and wp[nx, ny] == 0:
                visited[ny][nx] = True
                q.append((nx, ny))

    src = rgba.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            sa = src[x, y][3]
            if sa > 92:
                op[x, y] = src[x, y]
            elif not visited[y][x] and wp[x, y] == 0:
                op[x, y] = interior
            else:
                op[x, y] = src[x, y]
    return out


def extract_outline(
    src: Path,
    dst: Path,
    hi: float = 112.0,
    lo: float = 48.0,
    *,
    inner_fill: tuple[int, int, int, int] | None = None,
) -> None:
    """
    Keep dark strokes; drop checkerboard (~215+) and faint gray watermarks (~110–180).
    Anti-aliased edge pixels fall between `lo` and `hi`.
    """
    im = Image.open(src).convert("RGB")
    w, h = im.size
    rgba = Image.new("RGBA", (w, h))
    px = im.load()
    op = rgba.load()
    for y in range(h):
        for x in range(w):
            lum = luminance(px[x, y])
            if lum >= hi:
                op[x, y] = (0, 0, 0, 0)
            elif lum <= lo:
                op[x, y] = (0, 0, 0, 255)
            else:
                t = (hi - lum) / (hi - lo)
                a = int(max(0, min(255, round(255 * t))))
                op[x, y] = (0, 0, 0, a)

    a = rgba.split()[3]
    a = a.filter(ImageFilter.MedianFilter(size=3))
    rgba.putalpha(a)

    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)

    max_dim = 220
    rw, rh = rgba.size
    scale = min(max_dim / rw, max_dim / rh, 1.0)
    if scale < 1.0:
        nw = max(1, int(round(rw * scale)))
        nh = max(1, int(round(rh * scale)))
        rgba = rgba.resize((nw, nh), Image.Resampling.LANCZOS)

    if inner_fill is not None:
        rgba = fill_enclosed_interiors(rgba, inner_fill)

    rgba.save(dst, optimize=True)
    print(f"Wrote {dst} ({rgba.size[0]}x{rgba.size[1]} RGBA)")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    asset_dir = root / "assets" / "icons"
    legacy_icons = root / "icons"
    ref = root / "icons" / "refs"
    cursor_fallback = Path(
        "/Users/praak/.cursor/projects/Users-praak-cursor-12KHARI-baahrakhari-app/assets"
    )
    if not ref.exists() and cursor_fallback.exists():
        ref = cursor_fallback
    pairs = [
        (
            ref / "nepali_flag_moon-451fc48f-b31c-4d64-a1af-280a08c2a601.png",
            "nepali_flag_moon.png",
            (0, 0, 0, 255),
        ),
        (
            ref / "nepali_flag_sun-bb379375-8456-4d13-9b17-e4178ec36c85.png",
            "nepali_flag_sun.png",
            (255, 255, 255, 255),
        ),
    ]
    for src, name, fill in pairs:
        if not src.exists():
            raise SystemExit(f"Missing reference: {src}")
        extract_outline(src, asset_dir / name, inner_fill=fill)
        extract_outline(src, legacy_icons / name, inner_fill=fill)


if __name__ == "__main__":
    main()
