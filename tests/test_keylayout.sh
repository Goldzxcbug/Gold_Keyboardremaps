#!/bin/sh
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
layouts="$work/system/usr/keylayout"
mkdir -p "$layouts"
printf 'key 125 BOOKMARK\n' > "$layouts/Vendor_ffff_Product_ffff.kl"
printf 'key 125 COPY\n' > "$layouts/Vendor_22d9_Product_386a.kl"
printf 'user layout\n' > "$layouts/Vendor_05ac_Product_0239.kl"
printf 'old stamp\n' > "$work/keylayout.stamp"

GOLD_MODULE_DIR="$work" sh "$repo_dir/keylayout.sh" --check > "$work/report"
test -f "$layouts/Vendor_ffff_Product_ffff.kl"
test -f "$layouts/Vendor_22d9_Product_386a.kl"
test -f "$work/keylayout.stamp"
grep -q 'would remove obsolete' "$work/report"

GOLD_MODULE_DIR="$work" sh "$repo_dir/keylayout.sh"
test ! -e "$layouts/Vendor_ffff_Product_ffff.kl"
test ! -e "$layouts/Vendor_22d9_Product_386a.kl"
test ! -e "$work/keylayout.stamp"
test "$(cat "$layouts/Vendor_05ac_Product_0239.kl")" = 'user layout'

# Idempotent, and usable on a fresh install with no generated layout.
GOLD_MODULE_DIR="$work" sh "$repo_dir/keylayout.sh"
mkdir "$work/fresh"
GOLD_MODULE_DIR="$work/fresh" sh "$repo_dir/keylayout.sh"
test ! -e "$work/fresh/system"
echo 'test_keylayout: obsolete overrides removed; native and user layouts preserved'
