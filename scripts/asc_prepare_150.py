#!/usr/bin/env python3
"""Create App Store Connect iOS version 1.5.0 and fill listing fields.

Patterned on scripts/asc_prepare_140.py. Targets marketing 1.5.0 / CFBundleVersion 7.
Does not submit for review. Does not patch the live 1.4.0 version record.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from pathlib import Path
from urllib.parse import urlencode

import jwt

KEY_ID = os.environ.get("ASC_KEY_ID", "4T2A93HW9T")
ISSUER_ID = os.environ.get(
    "ASC_ISSUER_ID", "9c500f8b-2618-4f29-9688-de355b0b4df7"
)
APP_ID = "1461739733"
VERSION = "1.5.0"
BUILD_NUMBER = "7"
LIVE_VERSION = "1.4.0"
PRIVACY_URL = "https://baahrakhari.com/page/privacy-policy"
SUPPORT_URL = "https://baahrakhari.com/contact"
MARKETING_URL = "https://baahrakhari.com"
COPYRIGHT = "© 2026 Baahrakhari Pvt. Ltd."
API = "https://api.appstoreconnect.apple.com/v1"
REPO = Path(__file__).resolve().parents[1]
IPHONE_67_DIR = REPO / "marketing/screenshots/iphone-1284x2778"
IPHONE_67_FILES = (
    "01_home.png",
    "02_article.png",
    "03_drawer.png",
    "04_saved.png",
)
SKIP_IPHONE_FILES = {"05_dark_home.png"}
IPAD_DISPLAY = "APP_IPAD_PRO_3GEN_129"
IPHONE_67_DISPLAY = "APP_IPHONE_67"

WHATS_NEW = """Home now matches baahrakhari.com more closely.

• Larger Top News type (two lines); long-press a headline to save — share stays in the reader
• Below the fold: राजनीति, अर्थ व्यवसाय, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश
• Burger: overlay tap to close, theme at the bottom, swipe from the left edge on lists
• Hamro team sections start collapsed with the first two members visible; home-only static house banners (no AdMob)"""

WHATS_NEW_NE = """गृहपृष्ठ अब baahrakhari.com सँग अझ मिल्दोजुल्दो छ।

• शीर्ष समाचारको अक्षर ठूलो (दुई हरफ); लामो थिचेर सेभ — सेयर पठन पृष्ठमा रहन्छ
• मुनि: राजनीति, अर्थ व्यवसाय, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश
• बर्गर: ओभरले थिचेर बन्द, थिम तल, सूचीमा बायाँ किनाराबाट स्वाइप
• हाम्रो टिम सुरुमा संक्षिप्त; पहिलो दुई सदस्य देखिन्छन्; गृहपृष्ठमा मात्र स्थिर ब्यानर (AdMob होइन)"""

DESCRIPTION = """Baahrakhari brings the live news feed of baahrakhari.com to your iPhone and
iPad, redesigned for fast reading in clean Devanagari typography.

WHAT YOU CAN DO
• Swipe through the latest headlines across every Baahrakhari section
  (पछिल्ला, राजनीति, अर्थ, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश).
• Home shows Top News, a ताजा strip, then every section from the burger menu.
• Tap any article to read the full story in a calm, single-column layout.
  Share from the reader; long-press a Top News headline to save it.
• Pinch to zoom the Nepali body type to whatever size is comfortable.
• Save articles for later; saved stories open instantly even when offline.
• Light and dark modes from the burger menu (theme control at the bottom).
• Optional gentle reminders when fresh top stories arrive (off by default).

WHY YOU'LL LIKE IT
• Built around how Nepali readers actually read — no autoplay video, no
  pop-ups, no third-party ad networks. Home may show a few static house
  banners from baahrakhari.com; they never cover the article you are reading.
• Tablet-optimised on iPad and Android: bigger type and comfortable padding.
  iPad keeps a glass-style next-article button for long reading sessions.
• Respects your data: all preferences stay on your device. No account, no
  login, no tracking SDKs.

ABOUT
Baahrakhari (बाह्रखरी) is one of Nepal's established online news outlets.
This app is the official mobile companion of baahrakhari.com."""

DESCRIPTION_NE = """बाह्रखरी एप्लिकेसनले baahrakhari.com का ताजा समाचार तपाईंको iPhone वा iPad मा
सजिलो, सफा देवनागरी टाइपोग्राफीमा पुर्‍याउँछ।

मुख्य सुविधाहरू
• पछिल्ला, राजनीति, अर्थ, खेल, विचार, देश, साहित्य, सम्पादकीय र विदेश —
  सबै शीर्षकहरू एकै ठाउँमा।
• गृहपृष्ठमा शीर्ष समाचार, ताजा स्ट्रिप, र बर्गर मेनुका सबै श्रेणी।
• कुनै पनि समाचारलाई ट्याप गरेर शान्त पठनशैलीमा पढ्नुहोस्। सेयर पठन पृष्ठमा;
  शीर्ष समाचारमा लामो थिचेर सेभ गर्नुहोस्।
• नेपाली अक्षरको आकार पिञ्च गरेर मनपर्ने साइजमा सेट गर्नुहोस्।
• मनपरेका समाचार सेभ गर्नुहोस्; इन्टरनेट नहुँदा पनि तुरुन्तै खोल्नुहोस्।
• बर्गर मेनुबाट अध्यारो/उज्यालो मोड (थिम तलतिर)।
• चाहिए मात्र: नयाँ समाचारको शान्त सूचना।

तपाईंको गोपनीयता
सबै सेटिङ तपाईंको यन्त्रमै रहन्छ। कुनै खाता चाहिँदैन, कुनै ट्र्याकर छैन।
गृहपृष्ठमा baahrakhari.com का केही स्थिर ब्यानर देखिन सक्छन् — पठन पृष्ठ छोप्दैनन्।

बाह्रखरीबारे
बाह्रखरी नेपालको पुरानो र विश्वसनीय अनलाइन समाचार पोर्टल हो।
यो एप त्यसैको आधिकारिक मोबाइल साथी हो।"""

PROMO = (
    "Stay current with Baahrakhari — the latest news from Nepal across politics, "
    "economy, sports, and opinion, in clean Nepali typography on iPhone and iPad."
)
PROMO_NE = (
    "राजनीति, अर्थ, खेल, विचारसहितका बाह्रखरीका ताजा समाचार अब iPhone र iPad मा — "
    "सफा देवनागरी अक्षरमा, सरल पठनशैलीमा।"
)
KEYWORDS = "news,nepal,nepali,kathmandu,समाचार,बाह्रखरी,politics,sports,opinion"
KEYWORDS_NE = "समाचार,बाह्रखरी,नेपाल,काठमाडौं,राजनीति,खेलकुद,अर्थ,विचार,देश"
SUBTITLE = "बाह्रखरी समाचार · Nepal news"
SUBTITLE_NE = "नेपालका समाचार र विचार"

REVIEW_NOTES = """Sign-in is not required — the App has no login or account system.

Demo path (30 seconds):
1. Launch. Home shows the Baahrakhari logo, the Nepali date, centered शीर्ष समाचार (larger two-line type), optional static house banners, a ताजा समाचार horizontal strip, then the same category sections as the burger menu (राजनीति, अर्थ, खेल, विचार, देश, साहित्य, सम्पादकीय, विदेश).
2. Long-press a Top News headline to save it (toast: सुरक्षित भयो / पहिले नै सुरक्षित छ). Share lives on the article reader, not on the Home row.
3. Tap the logo — returns to Home. Open the burger (top-left); tap the dimmed overlay to close. Theme control is at the bottom of the drawer. सुरक्षित लेखहरू and सम्पर्क गर्नुहोस् / Contact us are in the drawer with the categories.
4. Open हाम्रो टिम. Each section starts collapsed with the first two members visible; the dropdown reveals the rest.
5. Tap a शीर्ष समाचार row or ताजा card to open the article.
6. Pinch on the article body — the Nepali type resizes. Bookmark and share are on the reader.
7. Open Saved from the drawer.

Home may show a few first-party static banners scraped from baahrakhari.com (images only; GIFs show the first frame). They sit in the Home list, never cover the article, and are not AdMob / not a third-party ad SDK. Tapping a banner may open the advertiser URL in the system browser.

Content rights (Guideline 5.2.3): Baahrakhari Pvt. Ltd. publishes both baahrakhari.com and this App. Articles are first-party.

Encryption: HTTPS/TLS only. ITSAppUsesNonExemptEncryption=false.

Notifications: local-only (UserNotifications). No APNs / remote push.

Not in the App: accounts, IAP, location, camera, mic, contacts, photos, AdMob, IDFA, third-party advertising or analytics SDKs. House banners on Home are first-party display images, not an ad network."""


def _token() -> str:
    key = Path.home() / ".appstoreconnect/private_keys" / f"AuthKey_{KEY_ID}.p8"
    now = int(time.time())
    return jwt.encode(
        {
            "iss": ISSUER_ID,
            "iat": now,
            "exp": now + 1200,
            "aud": "appstoreconnect-v1",
        },
        key.read_text(),
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def req(method: str, path: str, body: dict | None = None, ok=(2,)) -> tuple[int, dict]:
    url = path if path.startswith("http") else f"{API}{path}"
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
        raise SystemExit(
            f"{method} {path} → HTTP {code_i}\n{json.dumps(data, indent=2)[:2500]}"
        )
    return code_i, data


def find_version(version_string: str) -> dict | None:
    q = urlencode({"filter[platform]": "IOS", "limit": "20"})
    _, data = req("GET", f"/apps/{APP_ID}/appStoreVersions?{q}")
    for item in data.get("data") or []:
        if (item.get("attributes") or {}).get("versionString") == version_string:
            return item
    return None


def assert_live_untouched(before: dict | None) -> None:
    live = find_version(LIVE_VERSION)
    if not live:
        raise SystemExit(f"✗ live {LIVE_VERSION} missing — abort")
    state = (live.get("attributes") or {}).get("appStoreState")
    if state != "READY_FOR_SALE":
        raise SystemExit(f"✗ live {LIVE_VERSION} state is {state}, expected READY_FOR_SALE")
    if before and live["id"] != before["id"]:
        raise SystemExit("✗ live version id changed — abort")
    print(f"• Live {LIVE_VERSION} still READY_FOR_SALE id={live['id']} (untouched)")


def create_version() -> dict:
    existing = find_version(VERSION)
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
    print(
        f"  ✓ created {created['id']} state="
        f"{(created.get('attributes') or {}).get('appStoreState')}"
    )
    return created


def set_phased_release(version_id: str) -> None:
    """METADATA recommends phased App Store release after approval.

    Keep MANUAL until Submit for Review; attaching a phased-release resource
    selects Apple's 'phased release for automatic updates' without submitting.
    """
    _, current = req("GET", f"/appStoreVersions/{version_id}")
    attrs = (current.get("data") or {}).get("attributes") or {}
    print(f"• Version releaseType={attrs.get('releaseType')} (leaving MANUAL until submit)")
    _, existing = req(
        "GET", f"/appStoreVersions/{version_id}/appStoreVersionPhasedRelease", ok=(2, 4)
    )
    if existing.get("data"):
        state = (existing["data"].get("attributes") or {}).get("phasedReleaseState")
        print(f"  · phased release already present ({state})")
        return
    try:
        _, created = req(
            "POST",
            "/appStoreVersionPhasedReleases",
            {
                "data": {
                    "type": "appStoreVersionPhasedReleases",
                    "relationships": {
                        "appStoreVersion": {
                            "data": {"type": "appStoreVersions", "id": version_id}
                        }
                    },
                }
            },
        )
        state = (created.get("data") or {}).get("attributes") or {}
        print(
            f"  ✓ phased release {created['data']['id']} "
            f"state={state.get('phasedReleaseState')} "
            "(will apply after approval; not submitted)"
        )
    except SystemExit as exc:
        print(f"  · phased release not set (kept MANUAL): {str(exc).splitlines()[0][:180]}")


def ensure_locale(version_id: str, locale: str) -> dict | None:
    _, data = req("GET", f"/appStoreVersions/{version_id}/appStoreVersionLocalizations")
    for loc in data.get("data") or []:
        if (loc.get("attributes") or {}).get("locale") == locale:
            return loc
    print(f"• Creating {locale} version localization")
    try:
        _, created = req(
            "POST",
            "/appStoreVersionLocalizations",
            {
                "data": {
                    "type": "appStoreVersionLocalizations",
                    "attributes": {"locale": locale},
                    "relationships": {
                        "appStoreVersion": {
                            "data": {"type": "appStoreVersions", "id": version_id}
                        }
                    },
                }
            },
        )
        return created["data"]
    except SystemExit as exc:
        print(f"  · skip {locale}: {str(exc).splitlines()[0][:200]}")
        return None


def patch_localizations(version_id: str) -> dict:
    _, data = req("GET", f"/appStoreVersions/{version_id}/appStoreVersionLocalizations")
    items = data.get("data") or []
    print(f"• Version localizations: {len(items)}")
    for loc in items:
        print(f"  - {(loc.get('attributes') or {}).get('locale')} id={loc['id']}")

    en = ensure_locale(version_id, "en-US")
    if not en:
        raise SystemExit("✗ en-US localization missing")
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
    print("  ✓ en-US listing: support/marketing/whatsNew/description/keywords/promo")
    print(f"    supportUrl={attrs.get('supportUrl')}")
    print(f"    marketingUrl={attrs.get('marketingUrl')}")
    print(f"    whatsNew_len={len(attrs.get('whatsNew') or '')}")

    ne = None
    for candidate in ("ne-NP", "ne"):
        ne = ensure_locale(version_id, candidate)
        if ne:
            _, nupd = req(
                "PATCH",
                f"/appStoreVersionLocalizations/{ne['id']}",
                {
                    "data": {
                        "type": "appStoreVersionLocalizations",
                        "id": ne["id"],
                        "attributes": {
                            "whatsNew": WHATS_NEW_NE,
                            "description": DESCRIPTION_NE,
                            "keywords": KEYWORDS_NE,
                            "supportUrl": SUPPORT_URL,
                            "marketingUrl": MARKETING_URL,
                            "promotionalText": PROMO_NE,
                        },
                    }
                },
            )
            nattrs = (nupd.get("data") or {}).get("attributes") or {}
            print(
                f"  ✓ {nattrs.get('locale')} listing: whatsNew/description/keywords/promo"
            )
            break
    return en


def prepare_app_infos() -> None:
    _, data = req("GET", f"/apps/{APP_ID}/appInfos")
    infos = data.get("data") or []
    print(f"• App infos: {len(infos)}")
    editable = []
    live = []
    for info in infos:
        state = (info.get("attributes") or {}).get("appStoreState")
        age = (info.get("attributes") or {}).get("appStoreAgeRating")
        print(f"  - {info['id']} state={state} age={age}")
        if state == "READY_FOR_SALE":
            live.append(info)
            continue
        if state in {
            "PREPARE_FOR_SUBMISSION",
            "DEVELOPER_REJECTED",
            "REJECTED",
            "WAITING_FOR_REVIEW",
            "READY_FOR_REVIEW",
        }:
            editable.append(info)

    for info in editable:
        patch_app_info(info, touch_categories=True)
    if not editable:
        print("  · no editable appInfo yet")


def patch_app_info(info: dict, touch_categories: bool) -> None:
    info_id = info["id"]
    if touch_categories:
        try:
            _, updated = req(
                "PATCH",
                f"/appInfos/{info_id}",
                {
                    "data": {
                        "type": "appInfos",
                        "id": info_id,
                        "relationships": {
                            "primaryCategory": {
                                "data": {"type": "appCategories", "id": "NEWS"}
                            },
                            "secondaryCategory": {
                                "data": {
                                    "type": "appCategories",
                                    "id": "MAGAZINES_AND_NEWSPAPERS",
                                }
                            },
                        },
                    }
                },
            )
            print(f"  ✓ categories News / Magazines & Newspapers on {info_id}")
        except SystemExit as exc:
            print(f"  · categories skip: {str(exc).splitlines()[0][:180]}")

        try:
            _, ard = req("GET", f"/appInfos/{info_id}/ageRatingDeclaration")
            decl = ard.get("data") or {}
            did = decl.get("id")
            dattrs = decl.get("attributes") or {}
            print(
                f"  · ageRating advertising={dattrs.get('advertising')} "
                f"override={dattrs.get('ageRatingOverride')}"
            )
            if did and dattrs.get("advertising") is not False:
                req(
                    "PATCH",
                    f"/ageRatingDeclarations/{did}",
                    {
                        "data": {
                            "type": "ageRatingDeclarations",
                            "id": did,
                            "attributes": {"advertising": False},
                        }
                    },
                )
                print("  ✓ ageRating advertising=false (house banners are display)")
        except SystemExit as exc:
            print(f"  · ageRating skip: {str(exc).splitlines()[0][:180]}")

    _, locs = req("GET", f"/appInfos/{info_id}/appInfoLocalizations")
    for loc in locs.get("data") or []:
        locale = (loc.get("attributes") or {}).get("locale")
        attrs = {"privacyPolicyUrl": PRIVACY_URL}
        if locale == "en-US":
            attrs["subtitle"] = SUBTITLE
        elif locale in {"ne-NP", "ne"}:
            attrs["subtitle"] = SUBTITLE_NE
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
            )
            got = (updated.get("data") or {}).get("attributes") or {}
            print(
                f"  ✓ {locale} privacyPolicyUrl={got.get('privacyPolicyUrl')} "
                f"subtitle={got.get('subtitle')!r}"
            )
        except SystemExit as exc:
            print(f"  · skip {locale} on {info_id}: {str(exc).splitlines()[0][:180]}")


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
                            "data": {
                                "type": "appStoreVersions",
                                "id": version_id,
                            }
                        }
                    },
                }
            },
        )
        print(f"  ✓ review detail {created['data']['id']}")
        return
    rid = detail["id"]
    req(
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
    q = urlencode({"filter[app]": APP_ID, "sort": "-uploadedDate", "limit": "25"})
    _, data = req("GET", f"/builds?{q}")
    found = None
    for b in data.get("data") or []:
        attrs = b.get("attributes") or {}
        print(
            f"  build {attrs.get('version')} processing={attrs.get('processingState')} "
            f"expired={attrs.get('expired')} uploaded={attrs.get('uploadedDate')} "
            f"id={b.get('id')}"
        )
        if str(attrs.get("version")) == BUILD_NUMBER and not attrs.get("expired"):
            found = b
    return found


def attach_build(version_id: str, build: dict) -> None:
    req(
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
    print(
        f"  ✓ attached build {build['id']} "
        f"({(build.get('attributes') or {}).get('version')})"
    )


def confirm_build_attached(version_id: str) -> None:
    _, data = req("GET", f"/appStoreVersions/{version_id}/build")
    b = data.get("data") or {}
    attrs = b.get("attributes") or {}
    print(
        f"• Version build relationship: id={b.get('id')} "
        f"version={attrs.get('version')} processing={attrs.get('processingState')}"
    )


def list_screenshot_sets(loc_id: str) -> list[dict]:
    _, data = req("GET", f"/appStoreVersionLocalizations/{loc_id}/appScreenshotSets")
    return data.get("data") or []


def describe_sets(sets: list[dict], label: str) -> None:
    print(f"• Screenshot sets ({label}): {len(sets)}")
    for s in sets:
        dtype = (s.get("attributes") or {}).get("screenshotDisplayType")
        _, shots = req("GET", f"/appScreenshotSets/{s['id']}/appScreenshots")
        names = [
            (sh.get("attributes") or {}).get("fileName")
            for sh in (shots.get("data") or [])
        ]
        print(f"  - {dtype} n={len(names)} files={names}")


def ensure_screenshot_set(loc_id: str, display_type: str, sets: list[dict]) -> dict:
    for s in sets:
        if (s.get("attributes") or {}).get("screenshotDisplayType") == display_type:
            return s
    print(f"• Creating screenshot set {display_type}")
    _, created = req(
        "POST",
        "/appScreenshotSets",
        {
            "data": {
                "type": "appScreenshotSets",
                "attributes": {"screenshotDisplayType": display_type},
                "relationships": {
                    "appStoreVersionLocalization": {
                        "data": {
                            "type": "appStoreVersionLocalizations",
                            "id": loc_id,
                        }
                    }
                },
            }
        },
    )
    return created["data"]


def delete_screenshots_in_set(set_id: str) -> None:
    _, shots = req("GET", f"/appScreenshotSets/{set_id}/appScreenshots")
    for sh in shots.get("data") or []:
        name = (sh.get("attributes") or {}).get("fileName")
        req("DELETE", f"/appScreenshots/{sh['id']}", ok=(2, 4))
        print(f"    deleted prior {name}")


def put_upload(operations: list[dict], payload: bytes) -> None:
    for op in operations:
        headers = []
        for h in op.get("requestHeaders") or []:
            headers += ["-H", f"{h['name']}: {h['value']}"]
        offset = int(op.get("offset") or 0)
        length = int(op.get("length") or len(payload))
        chunk = payload[offset : offset + length]
        cmd = [
            "curl",
            "-sS",
            "-o",
            "/dev/null",
            "-w",
            "%{http_code}",
            "-X",
            op.get("method") or "PUT",
            *headers,
            "--data-binary",
            "@-",
            op["url"],
        ]
        out = subprocess.run(cmd, input=chunk, capture_output=True, check=False)
        code = (out.stdout or b"").decode().strip()
        if not code.startswith("2"):
            raise SystemExit(
                f"upload PUT → HTTP {code}\n{(out.stderr or b'').decode()[:400]}"
            )


def wait_complete(screenshot_id: str, timeout: int = 180) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        _, data = req("GET", f"/appScreenshots/{screenshot_id}")
        attrs = (data.get("data") or {}).get("attributes") or {}
        state = (attrs.get("assetDeliveryState") or {}).get("state")
        width = (attrs.get("imageAsset") or {}).get("width")
        if state == "COMPLETE" and width:
            print(f"    COMPLETE {screenshot_id}")
            return
        if state in {"FAILED", "INVALID"}:
            errs = (attrs.get("assetDeliveryState") or {}).get("errors")
            raise SystemExit(f"screenshot {screenshot_id} {state}: {errs}")
        time.sleep(5)
    raise SystemExit(f"screenshot {screenshot_id} still processing after {timeout}s")


def _flatten_png(path: Path, size: tuple[int, int]) -> bytes:
    from io import BytesIO

    from PIL import Image

    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[-1])
    if bg.size != size:
        bg = bg.resize(size, Image.Resampling.LANCZOS)
    buf = BytesIO()
    bg.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _set_complete(set_id: str, expected: int = 4) -> bool:
    _, shots = req("GET", f"/appScreenshotSets/{set_id}/appScreenshots")
    items = shots.get("data") or []
    if len(items) < expected:
        return False
    for sh in items:
        attrs = sh.get("attributes") or {}
        state = (attrs.get("assetDeliveryState") or {}).get("state")
        if state != "COMPLETE" or not (attrs.get("imageAsset") or {}).get("width"):
            return False
    return True


def _upload_files(set_id: str, files: list[tuple[str, bytes]]) -> None:
    delete_screenshots_in_set(set_id)
    for name, payload in files:
        checksum = hashlib.md5(payload).hexdigest()
        print(f"  • upload {name} ({len(payload)} bytes)")
        _, created = req(
            "POST",
            "/appScreenshots",
            {
                "data": {
                    "type": "appScreenshots",
                    "attributes": {"fileName": name, "fileSize": len(payload)},
                    "relationships": {
                        "appScreenshotSet": {
                            "data": {"type": "appScreenshotSets", "id": set_id}
                        }
                    },
                }
            },
        )
        sid = created["data"]["id"]
        ops = (created["data"].get("attributes") or {}).get("uploadOperations") or []
        if not ops:
            raise SystemExit(f"no uploadOperations for {name}")
        put_upload(ops, payload)
        req(
            "PATCH",
            f"/appScreenshots/{sid}",
            {
                "data": {
                    "type": "appScreenshots",
                    "id": sid,
                    "attributes": {
                        "uploaded": True,
                        "sourceFileChecksum": checksum,
                    },
                }
            },
        )
        wait_complete(sid)


def upload_iphone_67(loc_id: str) -> None:
    """Upload 01–04. Never touch iPad. Skip 05_dark_home.

    Apple 2026: 1284×2778 is APP_IPHONE_65; APP_IPHONE_67 wants 1290×2796
    (6.7"/6.9" class). Raw 1284 files fail IMAGE_INCORRECT_DIMENSIONS on 67.
    """
    sets = list_screenshot_sets(loc_id)
    describe_sets(sets, "before iPhone screenshot upload")
    ipad = [
        s
        for s in sets
        if (s.get("attributes") or {}).get("screenshotDisplayType") == IPAD_DISPLAY
    ]
    if ipad:
        print(
            "  · keeping existing iPad set (local recapture is Safari/blank — not replacing)"
        )
    else:
        print(
            "  · no iPad set on 1.5.0 yet; will not upload local Safari/blank iPad files"
        )

    files_65 = []
    files_67 = []
    for name in IPHONE_67_FILES:
        if name in SKIP_IPHONE_FILES:
            continue
        path = IPHONE_67_DIR / name
        if not path.is_file():
            raise SystemExit(f"missing {path}")
        files_65.append((name, _flatten_png(path, (1284, 2778))))
        files_67.append((name, _flatten_png(path, (1290, 2796))))

    set65 = ensure_screenshot_set(loc_id, "APP_IPHONE_65", sets)
    if _set_complete(set65["id"]):
        print("  · APP_IPHONE_65 already COMPLETE (01–04) — skip")
    else:
        print("  • APP_IPHONE_65 native 1284×2778 01–04")
        _upload_files(set65["id"], files_65)

    set67 = ensure_screenshot_set(loc_id, IPHONE_67_DISPLAY, list_screenshot_sets(loc_id))
    if _set_complete(set67["id"]):
        print("  · APP_IPHONE_67 already COMPLETE (01–04) — skip")
    else:
        print("  • APP_IPHONE_67 scaled 1290×2796 01–04")
        _upload_files(set67["id"], files_67)
    print("  ✓ iPhone 01–04 uploaded (skipped 05_dark_home / iPad / .raw.png)")


def report_app_level() -> None:
    _, app = req("GET", f"/apps/{APP_ID}")
    attrs = (app.get("data") or {}).get("attributes") or {}
    print(
        "• App-level contentRightsDeclaration="
        f"{attrs.get('contentRightsDeclaration')} "
        "(left as-is; app-level field also used by live 1.4.0)"
    )


def main() -> None:
    key = Path.home() / ".appstoreconnect/private_keys" / f"AuthKey_{KEY_ID}.p8"
    if not key.is_file():
        raise SystemExit("✗ API key missing")
    print("• API key present")

    live_before = find_version(LIVE_VERSION)
    if not live_before:
        raise SystemExit(f"✗ live {LIVE_VERSION} not found")
    print(
        f"• Live {LIVE_VERSION} "
        f"{(live_before.get('attributes') or {}).get('appStoreState')} "
        f"id={live_before['id']}"
    )

    version = create_version()
    vid = version["id"]
    assert_live_untouched(live_before)

    en = patch_localizations(vid)
    prepare_app_infos()
    upsert_review_detail(vid)
    set_phased_release(vid)
    report_app_level()

    print("• Recent builds:")
    build = find_build()
    if build and (build.get("attributes") or {}).get("processingState") == "VALID":
        attach_build(vid, build)
        confirm_build_attached(vid)
    elif build:
        print(
            f"  · build {BUILD_NUMBER} still "
            f"{(build.get('attributes') or {}).get('processingState')} — not attaching"
        )
    else:
        print(f"  · build {BUILD_NUMBER} not in ASC")

    upload_iphone_67(en["id"])
    describe_sets(list_screenshot_sets(en["id"]), "after upload")

    _, final_v = req("GET", f"/appStoreVersions/{vid}")
    fattrs = (final_v.get("data") or {}).get("attributes") or {}
    print(
        f"\n• Final {VERSION} state={fattrs.get('appStoreState')} "
        f"releaseType={fattrs.get('releaseType')} copyright={fattrs.get('copyright')}"
    )
    assert_live_untouched(live_before)
    print("• Did NOT submit for review")
    print(f"\nASC: https://appstoreconnect.apple.com/apps/{APP_ID}/appstore")
    print(
        f"Version: https://appstoreconnect.apple.com/apps/{APP_ID}/appstore/ios/version/inflight"
    )
    print(f"Version id: {vid}")


if __name__ == "__main__":
    main()
