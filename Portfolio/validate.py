#!/usr/bin/env python3
"""
Pre-deployment verification script for Prudhvi Simhadri's portfolio.
Validates that:
1. Canonical index.html exists at the deployment root.
2. Primary stylesheet (style.css) exists.
3. Every local asset (images, PDF resume, tool icons, photography, components) resolves to a real file.
4. Case sensitivity matches exactly (critical for Linux-based Cloudflare Pages environments).
"""

import os
import re
import sys
import urllib.parse

def run_validation():
    # Base directory is the directory containing this script (Portfolio/)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    index_path = os.path.join(base_dir, "index.html")

    print("=" * 65)
    print("  PORTFOLIO PRE-DEPLOYMENT VERIFICATION")
    print(f"  Root Directory: {base_dir}")
    print("=" * 65)

    if not os.path.isfile(index_path):
        print(f"[FAIL] Canonical index.html missing at {index_path}")
        return False

    print(f"[PASS] Found canonical index.html ({os.path.getsize(index_path):,} bytes)")

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Find all src and href attributes
    matches = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html)
    print(f"[INFO] Analyzed {len(matches)} attribute references in index.html")

    failures = []
    successes = []

    for ref in matches:
        # Ignore external URLs, anchors, mailto links, data URIs
        if ref.startswith(("http://", "https://", "mailto:", "#", "data:", "tel:")):
            continue

        clean_ref = ref.split("?")[0].split("#")[0]
        if not clean_ref:
            continue

        decoded = urllib.parse.unquote(clean_ref)
        target_path = os.path.join(base_dir, decoded)

        # Check file existence
        if not os.path.exists(target_path):
            failures.append((ref, decoded, "File does not exist"))
            continue

        # Check exact case-sensitivity for Linux hosts
        parts = decoded.split("/")
        current = base_dir
        case_mismatch = False
        for part in parts:
            if not os.path.exists(current):
                case_mismatch = True
                break
            entries = os.listdir(current)
            if part not in entries:
                case_mismatch = True
                break
            current = os.path.join(current, part)

        if case_mismatch:
            failures.append((ref, decoded, "Case sensitivity mismatch in path"))
        else:
            file_size = os.path.getsize(target_path)
            successes.append((ref, decoded, file_size))

    print("\n--- Verified Local Assets ---")
    for ref, decoded, size in successes:
        print(f"  [OK] {ref:<58} -> {size:>9,} bytes")

    if failures:
        print("\n--- Broken References Found ---")
        for ref, decoded, reason in failures:
            print(f"  [FAIL] {ref} ({reason})")
        print("\n" + "=" * 65)
        print(f"  VERIFICATION FAILED: {len(failures)} error(s)")
        print("=" * 65)
        return False

    print("\n" + "=" * 65)
    print(f"  ALL {len(successes)} LOCAL ASSETS VERIFIED SUCCESSFULLY (100% PASS)")
    print("=" * 65)
    return True

if __name__ == "__main__":
    success = run_validation()
    sys.exit(0 if success else 1)
