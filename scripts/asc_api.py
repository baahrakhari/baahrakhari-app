#!/usr/bin/env python3
"""Minimal App Store Connect API helper for Baahrakhari release setup."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

import jwt

KEY_ID = os.environ.get("ASC_KEY_ID", "4T2A93HW9T")
ISSUER_ID = os.environ.get(
    "ASC_ISSUER_ID", "9c500f8b-2618-4f29-9688-de355b0b4df7"
)
TEAM_ID = os.environ.get("ASC_TEAM_ID", "WGWJBSHXG5")
BUNDLE_ID = "com.baahrakhari"
SKU = "12365478"
ASC_APP_ID = "1461739733"
APP_NAME = "Baahrakhari"
API_BASE = "https://api.appstoreconnect.apple.com/v1"


def key_path() -> Path:
    for base in (
        Path.home() / ".appstoreconnect/private_keys",
        Path.home() / ".private_keys",
        Path.home() / "private_keys",
    ):
        candidate = base / f"AuthKey_{KEY_ID}.p8"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"AuthKey_{KEY_ID}.p8 not found")


def token() -> str:
    if not ISSUER_ID:
        raise SystemExit("ASC_ISSUER_ID is required")
    now = int(time.time())
    payload = {
        "iss": ISSUER_ID,
        "iat": now,
        "exp": now + 1200,
        "aud": "appstoreconnect-v1",
    }
    return jwt.encode(
        payload,
        key_path().read_text(),
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def request(method: str, path: str, body: dict | None = None) -> dict:
    url = f"{API_BASE}{path}"
    cmd = [
        "curl",
        "-s",
        "-w",
        "\nHTTP_CODE:%{http_code}",
        "-X",
        method,
        "-H",
        f"Authorization: Bearer {token()}",
        "-H",
        "Content-Type: application/json",
    ]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    cmd.append(url)
    out = subprocess.run(cmd, capture_output=True, text=True, check=False).stdout
    if "HTTP_CODE:" not in out:
        raise SystemExit(f"{method} {path} → no response\n{out}")
    body_text, code = out.rsplit("HTTP_CODE:", 1)
    code = code.strip()
    if not code.startswith("2"):
        raise SystemExit(f"{method} {path} → HTTP {code}\n{body_text}")
    return json.loads(body_text) if body_text.strip() else {}


def find_bundle_id() -> str | None:
    encoded = urllib.parse.quote(BUNDLE_ID, safe="")
    data = request("GET", f"/bundleIds?filter[identifier]={encoded}&limit=1")
    items = data.get("data") or []
    return items[0]["id"] if items else None


def create_bundle_id() -> str:
    data = request(
        "POST",
        "/bundleIds",
        {
            "data": {
                "type": "bundleIds",
                "attributes": {
                    "identifier": BUNDLE_ID,
                    "name": APP_NAME,
                    "platform": "IOS",
                },
            }
        },
    )
    return data["data"]["id"]


def find_app() -> dict | None:
    query = urllib.parse.urlencode({"filter[bundleId]": BUNDLE_ID, "limit": "1"})
    data = request("GET", f"/apps?{query}")
    items = data.get("data") or []
    return items[0] if items else None


def create_app() -> dict:
    bundle_id_resource = find_bundle_id()
    if not bundle_id_resource:
        print(f"• Registering bundle ID {BUNDLE_ID} …")
        bundle_id_resource = create_bundle_id()
        print(f"  ✓ bundle ID resource {bundle_id_resource}")
    else:
        print(f"• Bundle ID already registered ({bundle_id_resource})")

    return request(
        "POST",
        "/apps",
        {
            "data": {
                "type": "apps",
                "attributes": {
                    "name": APP_NAME,
                    "sku": SKU,
                    "primaryLocale": "en-US",
                },
                "relationships": {
                    "bundleId": {
                        "data": {"type": "bundleIds", "id": bundle_id_resource}
                    }
                },
            }
        },
    )["data"]


def main() -> None:
    existing = find_app()
    if not existing:
        raise SystemExit(
            f"✗ No ASC app found for bundle ID {BUNDLE_ID}. "
            "Expected existing app 1461739733 — check API key team access."
        )

    attrs = existing.get("attributes") or {}
    app_id = existing.get("id")
    print("✓ App Store Connect app (version update target):")
    print(f"  Name     : {attrs.get('name')}")
    print(f"  Bundle ID: {BUNDLE_ID}")
    print(f"  SKU      : {attrs.get('sku')}")
    print(f"  App ID   : {app_id}")
    if app_id != ASC_APP_ID:
        print(f"  ⚠ expected App ID {ASC_APP_ID}")

    vers_data = request(
        "GET", f"/apps/{app_id}/appStoreVersions?" + urllib.parse.urlencode({"limit": "5"})
    )
    items = vers_data.get("data") or []
    if items:
        print("\n  App Store versions:")
        for v in items:
            va = v.get("attributes") or {}
            print(
                f"    {va.get('versionString')} — {va.get('appStoreState')} ({va.get('platform')})"
            )

    print("\nNext: upload build, then ASC → Baahrakhari → + Version → 1.4.0")
    print("  https://appstoreconnect.apple.com/apps")


if __name__ == "__main__":
    main()
