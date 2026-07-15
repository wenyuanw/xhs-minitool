#!/usr/bin/env python3
"""Regression tests for validate_xhs_tool.py without third-party dependencies."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
VALIDATOR = SCRIPT_DIR / "validate_xhs_tool.py"
SPEC = importlib.util.spec_from_file_location("validate_xhs_tool", VALIDATOR)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def write_project(root: Path, html: str, extra: dict[str, str] | None = None) -> None:
    root.mkdir(parents=True, exist_ok=True)
    (root / "index.html").write_text(html, encoding="utf-8")
    for name, content in (extra or {}).items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def codes(root: Path) -> set[str]:
    return {item.code for item in MODULE.validate(root).findings}


def run_cli(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VALIDATOR), str(root), *args],
        check=False,
        capture_output=True,
        text=True,
    )


def expect_codes(
    failures: list[str],
    base: Path,
    name: str,
    html: str,
    extra: dict[str, str],
    expected: set[str],
) -> None:
    root = base / name
    write_project(root, html, extra)
    actual = codes(root)
    missing = expected - actual
    if missing:
        failures.append(f"{name}: missing {sorted(missing)}; actual={sorted(actual)}")


def main() -> int:
    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="xhs-validator-tests-") as tmp:
        base = Path(tmp)
        outside = base / "outside.js"
        outside.write_text("console.log('outside')\n", encoding="utf-8")

        valid_root = base / "valid"
        write_project(
            valid_root,
            "<!doctype html><html><head>"
            '<link rel="stylesheet" href="./styles.css">'
            "</head><body>"
            '<img src="./icon.svg" alt="">'
            '<script src="./app.js"></script>'
            "</body></html>",
            {
                "styles.css": ".hero { background: url('./icon.svg'); }\n",
                "app.js": "console.log('ok');\n",
                "icon.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n",
            },
        )
        actual = codes(valid_root)
        if actual:
            failures.append(f"valid: expected no findings; actual={sorted(actual)}")

        cases = [
            (
                "inline_script",
                "<!doctype html><script>console.log('inline')</script>",
                {},
                {"INLINE_SCRIPT"},
            ),
            (
                "unclosed_inline_script",
                "<!doctype html><script>console.log('inline')",
                {},
                {"INLINE_SCRIPT", "UNCLOSED_SCRIPT_TAG"},
            ),
            (
                "resource_escape",
                '<!doctype html><script src="../outside.js"></script>',
                {},
                {"RESOURCE_OUTSIDE_ROOT"},
            ),
            (
                "absolute_resource",
                '<!doctype html><script src="/app.js"></script>',
                {},
                {"ABSOLUTE_RESOURCE_PATH"},
            ),
            (
                "missing_css_url",
                '<!doctype html><link rel="stylesheet" href="./styles.css">',
                {"styles.css": ".hero { background: url('./missing.png'); }\n"},
                {"MISSING_LOCAL_RESOURCE"},
            ),
            (
                "mailto_navigation",
                '<!doctype html><a href="mailto:test@example.com">mail</a>',
                {},
                {"LINK_NAVIGATION"},
            ),
            (
                "meta_refresh",
                '<!doctype html><meta http-equiv="refresh" content="0;url=next.html">',
                {},
                {"META_REFRESH"},
            ),
            (
                "base_url",
                '<!doctype html><base href="./assets/">',
                {},
                {"BASE_URL"},
            ),
            (
                "form_navigation",
                '<!doctype html><form action="javascript:void(0)"></form>',
                {},
                {"FORM_NAVIGATION"},
            ),
            (
                "unsupported_mobile_apis",
                '<!doctype html><script src="./app.js"></script>',
                {
                    "app.js": (
                        "new PaymentRequest([], {});\n"
                        "Notification.requestPermission();\n"
                        "new NDEFReader();\n"
                        "navigator.requestMIDIAccess();\n"
                        "navigator.xr.requestSession('inline');\n"
                        "document.body.requestPointerLock();\n"
                        "new SyncManager();\n"
                    )
                },
                {
                    "PAYMENT_REQUEST", "NOTIFICATION_API", "NFC_API",
                    "MIDI_API", "XR_API", "POINTER_KEYBOARD_LOCK",
                    "BACKGROUND_SYNC",
                },
            ),
            (
                "network_storage_filesystem_download",
                '<!doctype html><script src="./app.js"></script>',
                {
                    "app.js": (
                        "navigator.sendBeacon('/log', 'x');\n"
                        "new WebTransport('https://example.com');\n"
                        "navigator.storage.persist();\n"
                        "showSaveFilePicker();\n"
                        "anchor.download = 'file.txt';\n"
                    )
                },
                {
                    "NETWORK_BEACON", "NETWORK_WEBTRANSPORT",
                    "PERSISTENT_STORAGE", "FILE_SYSTEM_ACCESS",
                    "PROGRAMMATIC_DOWNLOAD",
                },
            ),
            (
                "pwa_plugin_and_area_navigation",
                '<!doctype html><link rel="manifest" href="./manifest.json">'
                '<applet></applet><map><area href="./next.html"></map>',
                {"manifest.json": "{}\n"},
                {"PWA_MANIFEST", "EMBEDDED_CONTENT", "LINK_NAVIGATION"},
            ),
        ]

        for name, html, extra, expected in cases:
            expect_codes(failures, base, name, html, extra, expected)

        symlink_root = base / "symlink_case"
        write_project(symlink_root, "<!doctype html><title>ok</title>")
        (symlink_root / "linked.js").symlink_to(outside)
        actual = codes(symlink_root)
        if "SYMLINK" not in actual:
            failures.append(f"symlink_case: missing SYMLINK; actual={sorted(actual)}")

        valid_cli = run_cli(valid_root, "--json")
        if valid_cli.returncode != 0:
            failures.append(f"valid CLI: expected exit 0; actual={valid_cli.returncode}")
        else:
            try:
                payload = json.loads(valid_cli.stdout)
            except json.JSONDecodeError as error:
                failures.append(f"valid CLI JSON: decode failed: {error}")
            else:
                if payload.get("summary") != {"errors": 0, "warnings": 0}:
                    failures.append(f"valid CLI JSON: unexpected summary {payload.get('summary')}")

        warning_root = base / "warning_cli"
        write_project(
            warning_root,
            '<!doctype html><img src="data:image/png;base64,AA" alt="">',
        )
        warning_cli = run_cli(warning_root)
        strict_cli = run_cli(warning_root, "--strict")
        if warning_cli.returncode != 0:
            failures.append(f"warning CLI: expected exit 0; actual={warning_cli.returncode}")
        if strict_cli.returncode != 2:
            failures.append(f"strict CLI: expected exit 2; actual={strict_cli.returncode}")

        error_root = base / "error_cli"
        write_project(error_root, "<!doctype html><script>bad()</script>")
        error_cli = run_cli(error_root)
        if error_cli.returncode != 1:
            failures.append(f"error CLI: expected exit 1; actual={error_cli.returncode}")

    for failure in failures:
        print(f"FAIL: {failure}")
    print(f"Validator regression failures: {len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
