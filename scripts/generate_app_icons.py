#!/usr/bin/env python3
"""Resize assets/icons/12khari_app_icon.png into iOS AppIcon.appiconset + Android mipmaps."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icons" / "12khari_app_icon.png"
IOS_SET = ROOT / "ios" / "Baahrakhari" / "Images.xcassets" / "AppIcon.appiconset"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"


def save_resize(im: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)


def opaque_rgb1024(path: Path) -> None:
    """App Store marketing icon must not use transparency."""
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[3])
    bg.save(path, optimize=True)


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    ios_specs = [
        ("Icon-20@1x.png", 20),
        ("Icon-20@2x.png", 40),
        ("Icon-20@3x.png", 60),
        ("Icon-29@1x.png", 29),
        ("Icon-29@2x.png", 58),
        ("Icon-29@3x.png", 87),
        ("Icon-40@1x.png", 40),
        ("Icon-40@2x.png", 80),
        ("Icon-40@3x.png", 120),
        ("Icon-60@2x.png", 120),
        ("Icon-60@3x.png", 180),
        ("Icon-76@1x.png", 76),
        ("Icon-76@2x.png", 152),
        ("Icon-83.5@2x.png", 167),
        ("Icon-1024.png", 1024),
    ]
    for name, px in ios_specs:
        save_resize(src, IOS_SET / name, px)
    opaque_rgb1024(IOS_SET / "Icon-1024.png")

    contents = {
        "images": [
            {"filename": "Icon-20@2x.png", "idiom": "iphone", "scale": "2x", "size": "20x20"},
            {"filename": "Icon-20@3x.png", "idiom": "iphone", "scale": "3x", "size": "20x20"},
            {"filename": "Icon-29@2x.png", "idiom": "iphone", "scale": "2x", "size": "29x29"},
            {"filename": "Icon-29@3x.png", "idiom": "iphone", "scale": "3x", "size": "29x29"},
            {"filename": "Icon-40@2x.png", "idiom": "iphone", "scale": "2x", "size": "40x40"},
            {"filename": "Icon-40@3x.png", "idiom": "iphone", "scale": "3x", "size": "40x40"},
            {"filename": "Icon-60@2x.png", "idiom": "iphone", "scale": "2x", "size": "60x60"},
            {"filename": "Icon-60@3x.png", "idiom": "iphone", "scale": "3x", "size": "60x60"},
            {"filename": "Icon-20@1x.png", "idiom": "ipad", "scale": "1x", "size": "20x20"},
            {"filename": "Icon-20@2x.png", "idiom": "ipad", "scale": "2x", "size": "20x20"},
            {"filename": "Icon-29@1x.png", "idiom": "ipad", "scale": "1x", "size": "29x29"},
            {"filename": "Icon-29@2x.png", "idiom": "ipad", "scale": "2x", "size": "29x29"},
            {"filename": "Icon-40@1x.png", "idiom": "ipad", "scale": "1x", "size": "40x40"},
            {"filename": "Icon-40@2x.png", "idiom": "ipad", "scale": "2x", "size": "40x40"},
            {"filename": "Icon-76@1x.png", "idiom": "ipad", "scale": "1x", "size": "76x76"},
            {"filename": "Icon-76@2x.png", "idiom": "ipad", "scale": "2x", "size": "76x76"},
            {"filename": "Icon-83.5@2x.png", "idiom": "ipad", "scale": "2x", "size": "83.5x83.5"},
            {"filename": "Icon-1024.png", "idiom": "ios-marketing", "scale": "1x", "size": "1024x1024"},
        ],
        "info": {"author": "xcode", "version": 1},
    }
    (IOS_SET / "Contents.json").write_text(json.dumps(contents, indent=2) + "\n")

    for folder, px in [
        ("mipmap-mdpi", 48),
        ("mipmap-hdpi", 72),
        ("mipmap-xhdpi", 96),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xxxhdpi", 192),
    ]:
        d = ANDROID_RES / folder
        save_resize(src, d / "ic_launcher.png", px)
        save_resize(src, d / "ic_launcher_round.png", px)

    print("Wrote iOS AppIcon set and Android mipmaps from", SRC)


if __name__ == "__main__":
    main()
