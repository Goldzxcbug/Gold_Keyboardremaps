#!/bin/sh
# Host test for the virtual keyboard's identity, which three files spell out
# independently and nothing else compares.
#
# fn_remap.c decides the ids. keylayout.sh names a layout file after them, and
# the Anland consumer app matches the keyboard by them. Every one of those is a
# silent failure when they disagree:
#
#   * keylayout.sh out of step -> Android resolves no layout of ours, falls back
#     to Generic.kl, and the Meta key goes back to being swallowed by ROMs that
#     reserve it. Nothing logs anything.
#   * the app out of step -> the bus session stops recognising Gold's keyboard,
#     so no key is forwarded at all.
#
# Both are the kind of thing that is noticed on a device, by hand, days later.
# This turns them into a build failure.
#
# Usage: sh tests/test_device_identity.sh
#
# The Anland app lives in a different repository, so it is only checked when it
# can be found: point ANLAND_CONSUMER_DIR at the directory holding
# GoldUinputBusSession.java, or leave it unset to try the usual sibling path.
# Setting it and finding nothing there is an error rather than a skip -- if CI
# asks for the check, CI should get it.

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

pass=0
fail=0
skip=0

ok() {
    pass=$((pass + 1))
}

bad() {
    fail=$((fail + 1))
    printf 'FAIL: %s\n' "$1"
}

skip_note() {
    skip=$((skip + 1))
    printf 'SKIP: %s\n' "$1"
}

check() { # description expected actual
    if [ "$2" = "$3" ]; then
        ok
    else
        bad "$1: expected [$2] got [$3]"
    fi
}

# ---- the ids, as fn_remap.c declares them ----------------------------------

fn_remap="$repo_dir/fn_remap.c"
[ -f "$fn_remap" ] || { echo "no fn_remap.c at $fn_remap" >&2; exit 2; }

define() { # name
    sed -n "s/^#define[[:space:]]\{1,\}$1[[:space:]]\{1,\}\([^[:space:]]*\).*/\1/p" "$fn_remap" | head -1
}

vendor=$(define VIRTUAL_VENDOR)
product=$(define VIRTUAL_PRODUCT)

if [ -z "$vendor" ] || [ -z "$product" ]; then
    bad "fn_remap.c declares no VIRTUAL_VENDOR / VIRTUAL_PRODUCT"
    echo
    echo "test_device_identity: $pass passed, $fail failed, $skip skipped"
    exit 1
fi

# Android writes these as lowercase four digit hex, so the same ids have to
# spell the same way everywhere. %x on the shell needs the value as a number.
to_hex4() {
    printf '%04x' "$1"
}

vendor_hex=$(to_hex4 "$vendor")
product_hex=$(to_hex4 "$product")

# Zero would take Android down a different branch: its key layout lookup only
# uses vendor and product when both are non-zero.
if [ "$vendor_hex" = "0000" ] || [ "$product_hex" = "0000" ]; then
    bad "ids must be non-zero: Android falls back to Generic.kl otherwise"
else
    ok
fi

# ---- keylayout.sh names its file after them --------------------------------

keylayout="$repo_dir/keylayout.sh"
declared=$(sed -n 's/^LAYOUT_NAME=\(.*\)$/\1/p' "$keylayout" | head -1)
check "keylayout.sh names the layout after the ids" \
    "Vendor_${vendor_hex}_Product_${product_hex}.kl" "$declared"

# ---- and so does the consumer app ------------------------------------------

# Two layouts to try, so this needs no configuration in either place it runs:
# side by side on a workstation, and checked out inside the CI workspace.
consumer_rel=consumers/anland_v5/android_consumer/app/src/main/java/com/anland/consumer
consumer_dir=${ANLAND_CONSUMER_DIR:-}
wanted=${ANLAND_CONSUMER_DIR+set}
if [ -z "$consumer_dir" ]; then
    for candidate in "$repo_dir/../anland/$consumer_rel" "$repo_dir/anland/$consumer_rel"; do
        if [ -f "$candidate/GoldUinputBusSession.java" ]; then
            consumer_dir=$candidate
            break
        fi
    done
    [ -n "$consumer_dir" ] || consumer_dir="$repo_dir/../anland/$consumer_rel"
fi

bus_session="$consumer_dir/GoldUinputBusSession.java"
if [ ! -f "$bus_session" ]; then
    if [ "$wanted" = "set" ]; then
        bad "ANLAND_CONSUMER_DIR is set but holds no GoldUinputBusSession.java: $consumer_dir"
    else
        skip_note "no Anland checkout at $consumer_dir; set ANLAND_CONSUMER_DIR to check it"
    fi
else
    # Anchored to the start of the line. Unanchored, a commented-out constant
    # matches first and the check reports success for exactly the mismatch it
    # exists to catch.
    java_int() { # name
        sed -n "s/^[[:space:]]*static final int $1[[:space:]]*=[[:space:]]*\([^;]*\);.*/\1/p" \
            "$bus_session" | head -1
    }
    # The two languages spell the same number differently without meaning to, so
    # compare them case-insensitively; the layout file name above is what has to
    # be lowercase exactly.
    lower() {
        printf '%s' "$1" | tr 'A-F' 'a-f'
    }
    # Compared as numbers, not spellings: 0xffff and 65535 are the same id, and
    # a check that called them different would push someone into "fixing" a
    # constant that was already right.
    java_vendor=$(java_int GOLD_VENDOR)
    java_product=$(java_int GOLD_PRODUCT)
    if [ -z "$java_vendor" ] || [ -z "$java_product" ]; then
        bad "no live GOLD_VENDOR / GOLD_PRODUCT in $bus_session"
    else
        check "app GOLD_VENDOR matches fn_remap.c" \
            "$((vendor))" "$((java_vendor))"
        check "app GOLD_PRODUCT matches fn_remap.c" \
            "$((product))" "$((java_product))"
    fi

    # The prefix is what the app checks first, so it has to agree too.
    name_prefix=$(sed -n 's/^#define VIRTUAL_NAME_PREFIX "\(.*\)"$/\1/p' "$fn_remap" | head -1)
    java_prefix=$(sed -n 's/^[[:space:]]*static final String GOLD_NAME_PREFIX = "\(.*\)";.*$/\1/p' \
        "$bus_session" | head -1)
    check "app GOLD_NAME_PREFIX matches fn_remap.c" "$name_prefix" "$java_prefix"
fi

echo
echo "test_device_identity: $pass passed, $fail failed, $skip skipped"
[ "$fail" -eq 0 ]
