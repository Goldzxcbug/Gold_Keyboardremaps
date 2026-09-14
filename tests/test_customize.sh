#!/bin/sh
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
mkdir -p "$work/current" "$work/update/system/usr/keylayout"
printf 'active_profile=日常\nprofile=日常\nmapping=KEY_A=>KEY_B\nprofile=Anland\nmapping=KEY_LEFTMETA=>KEY_RIGHTMETA\n' \
    > "$work/current/config.conf"
printf 'fresh defaults\n' > "$work/update/config.conf"
cp "$repo_dir/keylayout.sh" "$work/update/keylayout.sh"
printf 'key 125 BOOKMARK\n' > "$work/update/system/usr/keylayout/Vendor_ffff_Product_ffff.kl"
run_install() (
    MODPATH="$work/update"
    GOLD_CURRENT_MODULE_DIR=$1
    ui_print() { :; }
    set_perm() { chmod "$4" "$1"; }
    abort() { echo "$*" >&2; exit 1; }
    . "$repo_dir/customize.sh"
)
run_install "$work/current"
cmp "$work/current/config.conf" "$work/update/config.conf"
test ! -e "$work/update/system/usr/keylayout/Vendor_ffff_Product_ffff.kl"
printf 'fresh defaults\n' > "$work/update/config.conf"
run_install "$work/missing"
test "$(cat "$work/update/config.conf")" = 'fresh defaults'
echo 'test_customize: upgrades preserve all profiles; fresh installs keep defaults'
