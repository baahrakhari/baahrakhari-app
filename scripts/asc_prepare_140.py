#!/usr/bin/env python3
"""Create App Store Connect iOS version 1.4.0 and fill listing fields."""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path
from urllib.parse import urlencode

import jwt

KEY_ID = "4T2A93HW9T"
ISSUER_ID = "9c500f8b-2618-4f29-9688-de355b0b4df7"
APP_ID = "1461739733"
VERSION = "1.4.0"
BUILD_NUMBER = "4"
PRIVACY_URL = "https://baahrakhari.com/page/privacy-policy"
SUPPORT_URL = "https://baahrakhari.com/contact"
MARKETING_URL = "https://baahrakhari.com"
COPYRIGHT = "© 2026 Baahrakhari Pvt. Ltd."
API = "https://api.appstoreconnect.apple.com/v1"

WHATS_NEW = """Home screen now matches baahrakhari.com more closely.

• Headlines occupy the top of Home (up to 12 rows) with a slim शीर्ष समाचार ribbon
• ताजा समाचार stays as a larger horizontal strip underneath
• Header is logo + Nepali date; theme and Saved live in the burger menu
• Share from headline rows; Contact us in the drawer (Nepali then English)"""

DESCRIPTION = """Baahrakhari brings the live news feed of baahrakhari.com to your iPhone and
iPad, redesigned for fast, distraction-free reading in clean Devanagari
typography.

WHAT YOU CAN DO
• Swipe through the latest headlines across every Baahrakhari section
  (पछिल्ला, राजनीति, अर्थ, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश).
• Tap any article to read the full story in a calm, single-column layout.
• Pinch to zoom the Nepali body type to whatever size is comfortable — your
  preference is remembered.
• Save articles for later with one tap; saved stories open instantly even
  when you're offline.
• Light and dark modes follow your system theme or can be locked manually.
• Optional gentle reminders when fresh top stories arrive (at most once
  per hour, fully off by default).

WHY YOU'LL LIKE IT
• Built around how Nepali readers actually read — no autoplay video, no
  cluttered ads, no pop-ups.
• iPad-optimised: bigger type, full-width category bar, and a glass-style
  next-article button for long reading sessions.
• Respects your data: all preferences stay on your device. No account, no
  login, no tracking SDKs.

ABOUT
Baahrakhari (बाह्रखरी) is one of Nepal's established online news outlets.
This app is the official mobile companion of baahrakhari.com."""

PROMO = (
    "Stay current with Baahrakhari — the latest news from Nepal across politics, "
    "economy, sports, and opinion, in clean Nepali typography on iPhone and iPad."
)
KEYWORDS = "news,nepal,nepali,kathmandu,समाचार,बाह्रखरी,politics,sports,opinion"
SUBTITLE = "बाह्रखरी समाचार · Nepal news"

REVIEW_NOTES = """Sign-in is not required — the App has no login or account system.

Demo path (30 seconds):
1. Launch. Home shows the Baahrakhari logo, Nepali date, slim शीर्ष समाचार (up to 12 rows), then ताजा समाचार horizontal strip.
2. Tap the logo to return Home. Open the burger (top-left).
3. Drawer: theme, सुरक्षित लेखहरू (Saved), सम्पर्क गर्नुहोस् / Contact us. Categories below.
4. Tap a शीर्ष समाचार row or ताजा card to open an article.
5. Pinch the article body to resize Nepali type.
6. Bookmark to save; open Saved from the drawer. Share from a headline row or the article.

Content rights (Guideline 5.2.3): Baahrakhari Pvt. Ltd. publishes both baahrakhari.com and this App. Articles are first-party.

Encryption: HTTPS/TLS only. ITSAppUsesNonExemptEncryption=false.

Notifications: local-only (UserNotifications). No APNs / remote push.

Not in the App: accounts, IAP, location, camera, mic, contacts, photos, ads, third-party analytics."""


def _token() -> str:
    key = Path.home() / ".appstoreconnect/private_keys" / f"AuthKey_{KEY_ID}.p8"
    now = int(time.time())
    return jwt.encode(
        {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
        key.read_text(),
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def req(method: str, path: str, body: dict | None = None, ok=(2,)) -> tuple[int, dict]:
    url = f"{API}{path}"
    cmd = [
        "curl",
        "-sS",
        "--globoff",
        "-w",
        "\nHTTP_CODE:%{http_code}",
        "-X",
        method,
        "-H",
        f"Authorization: Bearer {_token()}",
        "-H",
        "Content-Type: application/json",
        "-H",
        "Accept: application/json",
    ]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    cmd.append(url)
    out = subprocess.run(cmd, capture_output=True, text=True, check=False)
    raw = out.stdout
    if "HTTP_CODE:" not in raw:
        raise SystemExit(f"{method} {path} no HTTP code\n{out.stderr}\n{raw}")
    text, code = raw.rsplit("HTTP_CODE:", 1)
    code_i = int(code.strip() or "0")
    data = json.loads(text) if text.strip() else {}
    if not any(str(code_i).startswith(str(p)) for p in ok):
        raise SystemExit(f"{method} {path} → HTTP {code_i}\n{json.dumps(data, indent=2)[:2000]}")
    return code_i, data


def find_version() -> dict | None:
    q = urlencode({"filter[platform]": "IOS", "limit": "15"})
    _, data = req("GET", f"/apps/{APP_ID}/appStoreVersions?{q}")
    for item in data.get("data") or []:
        if (item.get("attributes") or {}).get("versionString") == VERSION:
            return item
    return None


def create_version() -> dict:
    existing = find_version()
    if existing:
        state = (existing.get("attributes") or {}).get("appStoreState")
        print(f"• Version {VERSION} already exists ({state}) id={existing['id']}")
        return existing
    print(f"• Creating iOS version {VERSION}")
    _, data = req(
        "POST",
        "/appStoreVersions",
        {
            "data": {
                "type": "appStoreVersions",
                "attributes": {
                    "platform": "IOS",
                    "versionString": VERSION,
                    "copyright": COPYRIGHT,
                    "releaseType": "MANUAL",
                },
                "relationships": {
                    "app": {"data": {"type": "apps", "id": APP_ID}}
                },
            }
        },
    )
    created = data["data"]
    print(f"  ✓ created {created['id']} state={(created.get('attributes') or {}).get('appStoreState')}")
    return created


def patch_localizations(version_id: str) -> None:
    _, data = req("GET", f"/appStoreVersions/{version_id}/appStoreVersionLocalizations")
    items = data.get("data") or []
    print(f"• Version localizations: {len(items)}")
    en = None
    for loc in items:
        locale = (loc.get("attributes") or {}).get("locale")
        print(f"  - {locale} id={loc['id']}")
        if locale == "en-US":
            en = loc
    if not en:
        print("• Creating en-US localization")
        _, data = req(
            "POST",
            "/appStoreVersionLocalizations",
            {
                "data": {
                    "type": "appStoreVersionLocalizations",
                    "attributes": {"locale": "en-US"},
                    "relationships": {
                        "appStoreVersion": {
                            "data": {"type": "appStoreVersions", "id": version_id}
                        }
                    },
                }
            },
        )
        en = data["data"]
    _, updated = req(
        "PATCH",
        f"/appStoreVersionLocalizations/{en['id']}",
        {
            "data": {
                "type": "appStoreVersionLocalizations",
                "id": en["id"],
                "attributes": {
                    "whatsNew": WHATS_NEW,
                    "description": DESCRIPTION,
                    "keywords": KEYWORDS,
                    "supportUrl": SUPPORT_URL,
                    "marketingUrl": MARKETING_URL,
                    "promotionalText": PROMO,
                },
            }
        },
    )
    attrs = (updated.get("data") or {}).get("attributes") or {}
    print("  ✓ en-US listing: support/marketing/whatsNew/description set")
    print(f"    supportUrl={attrs.get('supportUrl')}")


def patch_privacy_and_subtitle() -> None:
    _, data = req("GET", f"/apps/{APP_ID}/appInfos")
    infos = data.get("data") or []
    print(f"• App infos: {len(infos)}")
    targets = []
    for info in infos:
        state = (info.get("attributes") or {}).get("appStoreState")
        print(f"  - {info['id']} state={state}")
        if state in {
            "PREPARE_FOR_SUBMISSION",
            "DEVELOPER_REJECTED",
            "REJECTED",
            "WAITING_FOR_REVIEW",
            "READY_FOR_REVIEW",
        }:
            targets.append(info)
    if not targets:
        targets = infos[:1]
    # Prefer the prepare-for-submission info; still update all editable ones.
    seen = set()
    for info in targets:
        if info["id"] in seen:
            continue
        seen.add(info["id"])
        _, locs = req("GET", f"/appInfos/{info['id']}/appInfoLocalizations")
        for loc in locs.get("data") or []:
            locale = (loc.get("attributes") or {}).get("locale")
            attrs = {"privacyPolicyUrl": PRIVACY_URL}
            if locale == "en-US":
                attrs["subtitle"] = SUBTITLE
            try:
                _, updated = req(
                    "PATCH",
                    f"/appInfoLocalizations/{loc['id']}",
                    {
                        "data": {
                            "type": "appInfoLocalizations",
                            "id": loc["id"],
                            "attributes": attrs,
                        }
                    },
                    ok=(2,),
                )
                got = (updated.get("data") or {}).get("attributes") or {}
                print(f"  ✓ {locale} privacyPolicyUrl={got.get('privacyPolicyUrl')}")
            except SystemExit as exc:
                print(f"  · skip {locale} on {info['id']}: {str(exc).splitlines()[0]}")


def upsert_review_detail(version_id: str) -> None:
    _, data = req("GET", f"/appStoreVersions/{version_id}/appStoreReviewDetail", ok=(2, 4))
    detail = data.get("data")
    notes = {
        "contactFirstName": "Praakrit",
        "contactLastName": "Pradhan",
        "contactEmail": "baahrakhari@gmail.com",
        "contactPhone": "+977015911651",
        "demoAccountRequired": False,
        "notes": REVIEW_NOTES,
    }
    if not detail:
        print("• Creating review detail")
        _, created = req(
            "POST",
            "/appStoreReviewDetails",
            {
                "data": {
                    "type": "appStoreReviewDetails",
                    "attributes": notes,
                    "relationships": {
                        "appStoreVersion": {
                            "data": {"type": "appStoreVersions", "id": version_id}
                        }
                    },
                }
            },
        )
        print(f"  ✓ review detail {created['data']['id']}")
        return
    rid = detail["id"]
    _, updated = req(
        "PATCH",
        f"/appStoreReviewDetails/{rid}",
        {
            "data": {
                "type": "appStoreReviewDetails",
                "id": rid,
                "attributes": notes,
            }
        },
    )
    print(f"  ✓ review detail {rid} updated (demoAccountRequired=false)")


def find_build() -> dict | None:
    q = urlencode({"filter[app]": APP_ID, "sort": "-uploadedDate", "limit": "20"})
    _, data = req("GET", f"/builds?{q}")
    for b in data.get("data") or []:
        attrs = b.get("attributes") or {}
        print(
            f"  build {attrs.get('version')} processing={attrs.get('processingState')} "
            f"expired={attrs.get('expired')} uploaded={attrs.get('uploadedDate')}"
        )
        if str(attrs.get("version")) == BUILD_NUMBER and not attrs.get("expired"):
            return b
    return None


def attach_build(version_id: str, build: dict) -> None:
    _, data = req(
        "PATCH",
        f"/appStoreVersions/{version_id}",
        {
            "data": {
                "type": "appStoreVersions",
                "id": version_id,
                "relationships": {
                    "build": {"data": {"type": "builds", "id": build["id"]}}
                },
            }
        },
    )
    print(f"  ✓ attached build {build['id']} ({(build.get('attributes') or {}).get('version')})")


def main() -> None:
    version = create_version()
    vid = version["id"]
    patch_localizations(vid)
    patch_privacy_and_subtitle()
    upsert_review_detail(vid)
    print("• Recent builds:")
    build = find_build()
    if build and (build.get("attributes") or {}).get("processingState") == "VALID":
        attach_build(vid, build)
    elif build:
        print(
            f"  · build {BUILD_NUMBER} still "
            f"{(build.get('attributes') or {}).get('processingState')} — attach after VALID"
        )
    else:
        print(f"  · build {BUILD_NUMBER} not in ASC yet — attach after processing")
    print(f"\nASC: https://appstoreconnect.apple.com/apps/{APP_ID}/appstore")
    print(f"Version id: {vid}")


if __name__ == "__main__":
    main()
