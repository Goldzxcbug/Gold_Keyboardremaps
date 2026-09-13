#!/system/bin/sh
#
# keylayout.sh -- give Gold's own virtual keyboard a key layout in which the
# Meta key is an ordinary key.
#
# Android reserves KEYCODE_META_LEFT/RIGHT. On some ROMs -- OnePlus/OPPO's
# PhoneWindowManager consumes them for its own shortcut menu -- the reservation
# is enforced before any window is offered the event, so a Meta press reaches
# neither the app in front nor the desktop, while every other key from the same
# keyboard is delivered normally. Nothing in userspace can un-reserve a key.
#
# What Gold can change is what Android believes the scan code means. Gold
# creates the virtual keyboard, so Android resolves its layout from a file named
# after the ids in fn_remap.c rather than after any physical device. Declaring
# scan code 125/126 as ordinary keys keeps
# the scan code itself at 125/126, which is the part the desktop needs, while
# routing around the reservation. The consumer app resolves the key from the
# scan code, so it needs no change at all.
#
# Three properties of that lookup shape everything below.
#
#   * The device-specific file REPLACES Generic.kl rather than merging with it.
#     It therefore has to be a complete copy with two lines changed, and it has
#     to be rebuilt from whatever Generic.kl this device actually resolves.
#
#   * The file is read by system_server, so it needs the system_file label. A
#     file written from an ordinary root shell gets adb_data_file instead, and
#     the failure is silent -- Android quietly falls back to Generic.kl and the
#     Meta key stays broken. chcon is not optional here.
#
#   * A module's system/ tree is overlaid at boot, so a file written during a
#     running boot is only seen by the next one. The install step calls this too,
#     which is what makes the first boot after installing already correct.
#
# Usage: sh keylayout.sh [--check]
#   (no arguments)  regenerate when the source layout has changed
#   --check         report what would be done and change nothing
#
# Test overrides (never set on a device):
#   GOLD_MODULE_DIR      module root that receives system/usr/keylayout/
#   GOLD_KEYLAYOUT_DIRS  space separated directories to search, in order

set -u

MODULE_DIR=${GOLD_MODULE_DIR:-${0%/*}}
[ -d "$MODULE_DIR" ] || MODULE_DIR=.

# Android searches these in this order; the first Generic.kl found is the one a
# device without its own layout receives, and so the one to copy. Getting the
# order wrong would copy a different file than the one in force.
# `${VAR-default}` rather than `${VAR:-default}`: setting the variable to the
# empty string has to mean "search nothing". With the colon, an empty value
# silently falls back to the real system directories, which is the opposite of
# what a caller asking for an empty list wants.
SEARCH_DIRS=${GOLD_KEYLAYOUT_DIRS-"/odm/usr/keylayout /vendor/usr/keylayout /product/usr/keylayout /system/usr/keylayout"}

# Where the finished layout goes. Must match VIRTUAL_VENDOR / VIRTUAL_PRODUCT
# in fn_remap.c, which is where the virtual keyboard's ids come from; Android
# spells them as lowercase four digit hex. tests/test_device_identity.sh checks
# the two against each other -- a one-sided change here fails silently, Android
# simply finds no layout of ours and falls back to Generic.kl.
LAYOUT_NAME=Vendor_ffff_Product_ffff.kl
OUT_DIR="$MODULE_DIR/system/usr/keylayout"
OUT="$OUT_DIR/$LAYOUT_NAME"
STAMP="$MODULE_DIR/keylayout.stamp"

# Labels Android will accept and will not act on, best first.
#
# Two things rule a label out. It must stay clear of the key codes the consumer
# app resolves from its own table rather than from the scan code -- META_LEFT
# and META_RIGHT, SEARCH, ASSIST, F13-F24 -- or the app would map the key
# straight back to the reserved one and the whole exercise would be pointless.
# None of these is in that set.
#
# And it must be one the foreground application is unlikely to act on, because
# the substitute is what every application sees. Gold holds the keyboard all the
# time, so a Meta press while some other app has focus arrives there as this key
# code: mapping it to CUT would hand that app a cut. That is why the clipboard
# keys come last and are only reached when nothing better exists in the source
# layout -- an inert key is worth more here than a familiar one.
CANDIDATE_LABELS="BOOKMARK KATAKANA_HIRAGANA MUHENKAN HENKAN EISU KANA CUT COPY PASTE"

# The shape a mapping line takes. Android's parser tolerates leading whitespace
# and trailing content; requiring the canonical spelling would let a ROM that
# spells it differently look like a device with no Meta key at all, which ends
# with the script giving up rather than doing its job.
# Two spellings of the same anchor: grep -E takes an ERE, where an interval is
# `+`; sed takes a BRE, where the same interval has to be written `\{1,\}`.
# Using one spelling in both places makes the pattern match nothing, in the
# quiet way grep does -- which would look exactly like a device whose layout
# names no Meta key.
KEY_HEAD='^[[:space:]]*key[[:space:]]+'
KEY_HEAD_SED='[[:space:]]*key[[:space:]]\{1,\}'
# The same anchor plus the scan code, for matching a specific label rather than
# a specific code. Adding the digits here and then spelling the code out too
# would ask for two numbers in a row and match nothing.
KEY_LINE="$KEY_HEAD[0-9]+[[:space:]]+"

say() {
    echo "gold-keylayout: $*"
}

# The layout this device actually resolves, or nothing.
find_source() {
    for dir in $SEARCH_DIRS; do
        if [ -f "$dir/Generic.kl" ]; then
            printf '%s\n' "$dir/Generic.kl"
            return 0
        fi
    done
    return 1
}

# Prints the label to use for one of the two scan codes: the best candidate the
# source layout already names, skipping the first $2 that qualify. Reading the
# candidates out of the source is what proves this Android build's parser knows
# the label -- a name it cannot resolve would drop the line and leave the key
# unmapped, which is the silent failure this script exists to avoid.
#
# $2 counts *matches*, not positions in the list. Counting positions is wrong in
# a way that only shows up on devices that lack the first candidate: skipping
# position 0 leaves the first match -- which sits at a later position -- still
# reachable, so both scan codes get handed the same label while other usable
# ones sit unused. Most of the list is absent from a typical Generic.kl, so this
# is the common case, not an edge one.
pick_label() {
    source_layout=$1
    skip=$2
    matched=0
    for label in $CANDIDATE_LABELS; do
        # "key <code> LABEL", the shape a mapping line takes.
        if grep -qE "$KEY_LINE$label([[:space:]]|$)" "$source_layout"; then
            if [ "$matched" -ge "$skip" ]; then
                printf '%s\n' "$label"
                return 0
            fi
            matched=$((matched + 1))
        fi
    done
    return 1
}

# Copies the source layout over the output, replacing the two Meta lines.
# A source without them is left alone: this device would gain nothing, and
# inventing the lines would only make the file disagree with the ROM.
write_layout() {
    source_layout=$1
    meta_left=$2
    meta_right=$3
    if ! grep -qE "${KEY_HEAD}125[[:space:]]" "$source_layout"; then
        say "source layout names no scan code 125; leaving it alone"
        return 1
    fi
    mkdir -p "$OUT_DIR" || {
        say "cannot create $OUT_DIR"
        return 1
    }
    # Private to this run. Two of these overlap in practice -- the boot service
    # and an install or a manual run -- and a shared name lets them truncate
    # each other's write, publishing a file that matches neither source while
    # the stamp records one of them.
    tmp="$OUT.new.$$"
    sed -e "s|^${KEY_HEAD_SED}125[[:space:]].*|key 125   $meta_left|" \
        -e "s|^${KEY_HEAD_SED}126[[:space:]].*|key 126   $meta_right|" \
        "$source_layout" > "$tmp" || return 1
    if ! mv "$tmp" "$OUT"; then
        rm -f "$tmp"
        say "cannot write $OUT"
        return 1
    fi
    return 0
}

# system_server cannot read the file without this, and says nothing when it
# cannot. Applied to the directory as well, since the lookup stats through it.
label_for_system() {
    if ! command -v chcon >/dev/null 2>&1; then
        say "chcon unavailable; the layout may be ignored"
        return 1
    fi
    chcon u:object_r:system_file:s0 "$OUT_DIR" "$OUT" 2>/dev/null || {
        say "could not set system_file on the layout; it may be ignored"
        return 1
    }
    return 0
}

current_stamp() {
    # cksum rather than a hash tool: it is the one checksum in toybox on every
    # build, and a change in the source is all this needs to notice.
    cksum "$1" 2>/dev/null
}

check_only=0
[ "${1:-}" = "--check" ] && check_only=1

# A layout left behind by an earlier identity is worse than useless: it names
# real hardware's vendor and product, so it would be handed to that hardware and
# change two of its keys -- the very collision the synthetic ids exist to avoid.
#
# This runs before the up-to-date check rather than after it. Changing the ids
# in fn_remap.c leaves the source layout untouched, so "nothing changed" is
# exactly the case that produces a file to clean up. This directory holds
# nothing but what this script writes.
clear_stale_layouts() {
    [ -d "$OUT_DIR" ] || return 0
    for stale in "$OUT_DIR"/Vendor_*.kl; do
        [ -e "$stale" ] || continue
        [ "$stale" = "$OUT" ] && continue
        rm -f "$stale"
        say "removed stale layout $(basename "$stale")"
    done
}

# Runs before the give-up paths below as well as after them: a layout left by an
# earlier identity is dangerous on its own account, whether or not this run can
# produce a replacement. Skipped under --check, which must change nothing.
if [ "$check_only" = 0 ]; then
    clear_stale_layouts
fi

source_layout=$(find_source) || {
    say "no Generic.kl found in: $SEARCH_DIRS"
    say "the Meta key will keep being swallowed by the ROM"
    exit 0
}

meta_left=$(pick_label "$source_layout" 0) || {
    say "no substitute key available in $source_layout"
    exit 0
}
meta_right=$(pick_label "$source_layout" 1) || meta_right=$meta_left

if [ "$check_only" = 1 ]; then
    say "source: $source_layout"
    say "would map 125 -> $meta_left, 126 -> $meta_right"
    say "output: $OUT"
    exit 0
fi

# Rewriting only when nothing relevant moved keeps this cheap enough to run
# every boot, which is what lets a ROM update heal itself instead of leaving a
# stale copy behind with keys that no longer match the system.
#
# The stamp covers the labels as well as the source. Hashing the source alone
# would make the chosen labels sticky: changing the candidate list above is a
# change to this script, not to Generic.kl, so every device would keep the
# mapping it happened to generate first and never notice. The labels are the
# half of the output that this script decides.
stamp_now="$(current_stamp "$source_layout") $meta_left $meta_right"
if [ -f "$OUT" ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$stamp_now" ]; then
    exit 0
fi

write_layout "$source_layout" "$meta_left" "$meta_right" || exit 0

# Stamped only once the file is in place *and* labelled. Recording success while
# the label is missing is the worst outcome available here: system_server cannot
# read the file, quietly falls back to Generic.kl, and the Meta key goes back to
# being swallowed -- with a stamp saying everything is fine, so no later boot
# ever revisits it. Leaving the stamp unwritten costs one rewrite per boot and
# keeps the failure retryable and visible.
if ! label_for_system; then
    say "NOT stamped: the layout may be ignored, will retry on the next boot"
    exit 1
fi

printf '%s\n' "$stamp_now" > "$STAMP"

# Report what was written, not what was intended. A source with a 125 line and
# no 126 line gets one substitution, and saying otherwise would send anyone
# reading the log looking for a mapping that is not in the file.
if grep -qE "${KEY_HEAD}126[[:space:]]" "$source_layout"; then
    say "mapped 125 -> $meta_left, 126 -> $meta_right from $source_layout"
else
    say "mapped 125 -> $meta_left from $source_layout"
    say "the source names no scan code 126; right Meta left as the ROM has it"
fi
say "takes effect on the next boot"
exit 0
