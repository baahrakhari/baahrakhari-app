#!/usr/bin/env python3
"""Upload listing-ready 1.5.0 iPad screenshots and submit App Store review.

Does not touch live 1.4.0. Does not print API keys or .p8 material.
Does not upload 02_article (Fast Refresh debug banner) or 05_dark_home.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from urllib.parse import urlencode

REPO = Path(__file__).resolve().parents[1]
PREPARE = REPO / "scripts/asc_prepare_150.py"
IPAD_DIR = REPO / "marketing/screenshots/ipad-2064x2752"
# Listing-ready only (no Safari, no blank, no SpringBoard, no debug banner).
IPAD_FILES = ("01_home.png", "03_drawer.png", "04_saved.png")
VERSION_ID = "8f81e4a5-6377-4607-9553-84861588ffe8"
BUILD_ID = "41432b93-551b-4412-8fbc-3006f8e7a1e6"


def load_prepare():
    spec = importlib.util.spec_from_file_location("asc_prepare_150", PREPARE)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def try_privacy_label(m) -> None:
    print("• App Privacy nutrition label")
    paths = [
        f"/apps/{m.APP_ID}/appDataUsages",
        f"/apps/{m.APP_ID}/dataUsage",
        f"/appDataUsages?filter[app]={m.APP_ID}",
        f"/apps/{m.APP_ID}/privacyDeclarations",
    ]
    for path in paths:
        try:
            code, data = m.req("GET", path, ok=(2, 4))
            print(f"  · GET {path} → HTTP {code} keys={list(data)[:6]}")
            blob = json.dumps(data)[:400]
            if blob.strip() not in {"{}", "null"}:
                print(f"    {blob}")
            return
        except SystemExit as exc:
            print(f"  · {path}: {str(exc).splitlines()[0][:160]}")
    print("  · API cannot read nutrition questionnaire (same as listing prep)")
    print("    PRIVACY.md already matches: no AdMob / no advertising data; house banners are display")


def upload_ipad(m, loc_id: str) -> None:
    files_2064 = []
    files_2048 = []
    for name in IPAD_FILES:
        path = IPAD_DIR / name
        if not path.is_file():
            raise SystemExit(f"missing {path}")
        files_2064.append((name, m._flatten_png(path, (2064, 2752))))
        files_2048.append((name, m._flatten_png(path, (2048, 2732))))

    sets = m.list_screenshot_sets(loc_id)
    m.describe_sets(sets, "before iPad replace")

    display_candidates = (
        "APP_IPAD_PRO_3GEN_129",
        "APP_IPAD_PRO_129",
        "APP_IPAD_13",
    )
    existing_ipad = [
        s
        for s in sets
        if str((s.get("attributes") or {}).get("screenshotDisplayType", "")).startswith(
            "APP_IPAD"
        )
    ]
    target = None
    for cand in display_candidates:
        for s in existing_ipad:
            if (s.get("attributes") or {}).get("screenshotDisplayType") == cand:
                target = s
                break
        if target:
            break
    if not target and existing_ipad:
        target = existing_ipad[0]
    if not target:
        for cand in display_candidates:
            try:
                target = m.ensure_screenshot_set(loc_id, cand, sets)
                print(f"  • created set {cand}")
                break
            except SystemExit as exc:
                print(f"  · cannot create {cand}: {str(exc).splitlines()[0][:180]}")
    if not target:
        raise SystemExit("✗ no iPad screenshot set could be created")

    dtype = (target.get("attributes") or {}).get("screenshotDisplayType")
    print(f"  • replacing iPad set {dtype} id={target['id']} with 01/03/04 (1.5.0 UI)")

    try:
        if dtype in {"APP_IPAD_PRO_3GEN_129", "APP_IPAD_PRO_129"}:
            m._upload_files(target["id"], files_2048)
        else:
            m._upload_files(target["id"], files_2064)
    except SystemExit as exc:
        msg = str(exc)
        print(f"  · first size rejected: {msg.splitlines()[0][:200]}")
        if "IMAGE_INCORRECT_DIMENSIONS" in msg or "INCORRECT_DIMENSION" in msg:
            alt = files_2064 if files_2048[0][1] != files_2064[0][1] else files_2048
            print("  • retrying alternate 13-inch / 12.9-inch size")
            m._upload_files(target["id"], alt)
        else:
            raise

    m.describe_sets(m.list_screenshot_sets(loc_id), "after iPad replace")


def submit_review(m, version_id: str) -> None:
    print("• Submit for Review (App Store version, not TestFlight beta)")
    # Newer reviewSubmissions flow.
    try:
        _, created = m.req(
            "POST",
            "/reviewSubmissions",
            {
                "data": {
                    "type": "reviewSubmissions",
                    "attributes": {"platform": "IOS"},
                    "relationships": {
                        "app": {"data": {"type": "apps", "id": m.APP_ID}}
                    },
                }
            },
        )
        rid = created["data"]["id"]
        state = (created["data"].get("attributes") or {}).get("state")
        print(f"  ✓ reviewSubmission {rid} state={state}")
        m.req(
            "POST",
            "/reviewSubmissionItems",
            {
                "data": {
                    "type": "reviewSubmissionItems",
                    "relationships": {
                        "reviewSubmission": {
                            "data": {"type": "reviewSubmissions", "id": rid}
                        },
                        "appStoreVersion": {
                            "data": {
                                "type": "appStoreVersions",
                                "id": version_id,
                            }
                        },
                    },
                }
            },
        )
        print("  ✓ attached appStoreVersion 1.5.0")
        _, patched = m.req(
            "PATCH",
            f"/reviewSubmissions/{rid}",
            {
                "data": {
                    "type": "reviewSubmissions",
                    "id": rid,
                    "attributes": {"submitted": True},
                }
            },
        )
        attrs = (patched.get("data") or {}).get("attributes") or {}
        print(f"  ✓ submitted=true state={attrs.get('state')} submittedDate={attrs.get('submittedDate')}")
        return
    except SystemExit as exc:
        print(f"  · reviewSubmissions: {str(exc).splitlines()[0][:220]}")

    print("  • falling back to appStoreVersionSubmissions")
    _, created = m.req(
        "POST",
        "/appStoreVersionSubmissions",
        {
            "data": {
                "type": "appStoreVersionSubmissions",
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
    sid = created["data"]["id"]
    attrs = (created["data"].get("attributes") or {}).get("appStoreState")
    print(f"  ✓ appStoreVersionSubmission {sid} appStoreState={attrs}")


def main() -> None:
    m = load_prepare()
    live_before = m.find_version(m.LIVE_VERSION)
    if not live_before:
        raise SystemExit("✗ live 1.4.0 missing")
    print(
        f"• Live {m.LIVE_VERSION} "
        f"{(live_before.get('attributes') or {}).get('appStoreState')} "
        f"id={live_before['id']}"
    )

    version = m.find_version(m.VERSION)
    if not version:
        raise SystemExit("✗ 1.5.0 version missing")
    vid = version["id"]
    vattrs = version.get("attributes") or {}
    print(
        f"• Version {m.VERSION} id={vid} state={vattrs.get('appStoreState')} "
        f"releaseType={vattrs.get('releaseType')}"
    )
    if vid != VERSION_ID:
        print(f"  · note: expected id {VERSION_ID}")
    m.confirm_build_attached(vid)
    _, b = m.req("GET", f"/appStoreVersions/{vid}/build")
    bid = (b.get("data") or {}).get("id")
    bver = ((b.get("data") or {}).get("attributes") or {}).get("version")
    if str(bver) != m.BUILD_NUMBER:
        raise SystemExit(f"✗ attached build is {bver}, expected {m.BUILD_NUMBER}")
    if bid != BUILD_ID:
        print(f"  · build id {bid} (expected {BUILD_ID})")

    _, locs = m.req("GET", f"/appStoreVersions/{vid}/appStoreVersionLocalizations")
    en = None
    for loc in locs.get("data") or []:
        if (loc.get("attributes") or {}).get("locale") == "en-US":
            en = loc
    if not en:
        raise SystemExit("✗ en-US localization missing")
    en_attrs = en.get("attributes") or {}
    print(
        f"• en-US whatsNew_len={len(en_attrs.get('whatsNew') or '')} "
        f"support={en_attrs.get('supportUrl')} marketing={en_attrs.get('marketingUrl')}"
    )

    _, review = m.req(
        "GET", f"/appStoreVersions/{vid}/appStoreReviewDetail", ok=(2, 4)
    )
    rdetail = review.get("data") or {}
    rattrs = rdetail.get("attributes") or {}
    print(
        f"• review detail demoRequired={rattrs.get('demoAccountRequired')} "
        f"notes_len={len(rattrs.get('notes') or '')} "
        f"contact={rattrs.get('contactFirstName')} {rattrs.get('contactLastName')}"
    )

    try_privacy_label(m)
    upload_ipad(m, en["id"])

    if vattrs.get("appStoreState") == "PREPARE_FOR_SUBMISSION":
        submit_review(m, vid)
    else:
        print(f"  · skip submit; state is {vattrs.get('appStoreState')}")

    _, final_v = m.req("GET", f"/appStoreVersions/{vid}")
    fattrs = (final_v.get("data") or {}).get("attributes") or {}
    print(
        f"\n• Final {m.VERSION} state={fattrs.get('appStoreState')} "
        f"releaseType={fattrs.get('releaseType')}"
    )
    m.assert_live_untouched(live_before)
    print(f"\nASC: https://appstoreconnect.apple.com/apps/{m.APP_ID}/appstore")
    print(
        f"Version: https://appstoreconnect.apple.com/apps/{m.APP_ID}/appstore/ios/version/inflight"
    )
    print(f"Version id: {vid}")
    print("• Android/Play was not started")


if __name__ == "__main__":
    main()
