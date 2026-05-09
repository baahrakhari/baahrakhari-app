#!/usr/bin/env python3
"""Emit save_article_inner_template.png — white silhouette of enclosed bookmark interior for accent tint."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "assets" / "icons" / "save_article.png"
    dst = root / "assets" / "icons" / "save_article_inner_template.png"
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()

    vis = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not vis[y][x] and px[x, y][3] < 45:
            vis[y][x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if (
                0 <= nx < w
                and 0 <= ny < h
                and not vis[ny][nx]
                and px[nx, ny][3] < 45
            ):
                vis[ny][nx] = True
                q.append((nx, ny))

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 45 and not vis[y][x]:
                op[x, y] = (255, 255, 255, 255)
            else:
                op[x, y] = (0, 0, 0, 0)
    out.save(dst, optimize=True)
    print(f"Wrote {dst}")


if __name__ == "__main__":
    main()
