#!/bin/sh
# Host test for `keylayout.sh`.
#
# Runs the real script against fake search trees, so every branch is exercised
# without a device, root, SELinux or a reboot. The script exists to keep the
# Meta key alive past ROMs that reserve it, and each property the device check
# depends on is pinned here: the copy is complete, only the two Meta lines
# move, the labels are ones the source itself proves this Android can parse,
# nothing reserved is chosen, and a source that changes is noticed.
#
# Usage: sh tests/test_keylayout.sh

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM

script="$repo_dir/keylayout.sh"
module="$work/module"
mkdir -p "$module"

pass=0
fail=0

ok() {
    pass=$((pass + 1))
}

bad() {
    fail=$((fail + 1))
    printf 'FAIL: %s\n' "$1"
}

check() { # description expected actual
    if [ "$2" = "$3" ]; then
        ok
    else
        bad "$1: expected [$2] got [$3]"
    fi
}

# A stand-in Generic.kl with the lines the script keys off. Real ones carry a
# few hundred more, but nothing here depends on the rest.
write_source() { # path [meta-left-line]
    left=${2:-"key 125   META_LEFT"}
    {
        echo "# Generic.kl"
        echo "key 1     ESCAPE"
        echo "key 30    A"
        echo "key 42    LEFTSHIFT"
        echo "$left"
        echo "key 126   META_RIGHT"
        echo "key 133   COPY"
        echo "key 135   PASTE"
        echo "key 136   CUT"
        echo "key 168   BOOKMARK"
        echo "key 215   KATAKANA_HIRAGANA"
        echo "key 217   SEARCH"
    } > "$1"
}

# A stub chcon, so this suite is about the script rather than about whether the
# machine running it happens to have SELinux tools. GOLD_TEST_CHCON_EXIT=1 makes
# it fail, which is how the "could not label it" path is reached.
stub_bin="$work/bin"
mkdir -p "$stub_bin"
cat > "$stub_bin/chcon" <<'STUB'
#!/bin/sh
exit "${GOLD_TEST_CHCON_EXIT:-0}"
STUB
chmod 0755 "$stub_bin/chcon"

run() { # module-dir search-dirs [extra args...]
    PATH="$stub_bin:$PATH" GOLD_MODULE_DIR="$1" GOLD_KEYLAYOUT_DIRS="$2" \
        /bin/sh "$script" "${3:-}"
}

out() { printf '%s\n' "$module/system/usr/keylayout/Vendor_ffff_Product_ffff.kl"; }

# ---- the file lands where Android looks, under the name Android derives -----

mkdir -p "$work/sys/usr/keylayout"
write_source "$work/sys/usr/keylayout/Generic.kl"
run "$module" "$work/sys/usr/keylayout" >/dev/null 2>&1

if [ -f "$(out)" ]; then ok; else bad "no layout written"; fi
check "meta left rewritten" "key 125   BOOKMARK" "$(sed -n 's/^\(key 125.*\)$/\1/p' "$(out)")"
check "meta right rewritten" "key 126   KATAKANA_HIRAGANA" "$(sed -n 's/^\(key 126.*\)$/\1/p' "$(out)")"

# ---- and it is a complete copy, because the device file replaces Generic.kl -

check "line count preserved" \
    "$(wc -l < "$work/sys/usr/keylayout/Generic.kl")" "$(wc -l < "$(out)")"
check "unrelated key preserved" "key 30    A" "$(sed -n 's/^\(key 30.*\)$/\1/p' "$(out)")"
check "escape preserved" "key 1     ESCAPE" "$(sed -n 's/^\(key 1 .*\)$/\1/p' "$(out)")"

# ---- the labels chosen are ones the source itself names --------------------
# A label this Android cannot parse would silently drop the line and leave the
# key unmapped, which is the failure mode the whole script exists to avoid.

if grep -qE "^key[[:space:]]+[0-9]+[[:space:]]+COPY[[:space:]]*$" "$work/sys/usr/keylayout/Generic.kl"; then
    ok
else
    bad "test source lost its COPY line"
fi

# ---- labels the source does not name are skipped ---------------------------

mkdir -p "$work/bare/usr/keylayout"
{
    echo "key 30    A"
    echo "key 125   META_LEFT"
    echo "key 126   META_RIGHT"
    echo "key 135   PASTE"
} > "$work/bare/usr/keylayout/Generic.kl"

module_bare="$work/module-bare"
mkdir -p "$module_bare"
run "$module_bare" "$work/bare/usr/keylayout" >/dev/null 2>&1
check "skips labels the source lacks" "key 125   PASTE" \
    "$(sed -n 's/^\(key 125.*\)$/\1/p' "$module_bare/system/usr/keylayout/Vendor_ffff_Product_ffff.kl")"

# One usable label serves both, rather than leaving 126 unmapped.
check "reuses the only label for 126" "key 126   PASTE" \
    "$(sed -n 's/^\(key 126.*\)$/\1/p' "$module_bare/system/usr/keylayout/Vendor_ffff_Product_ffff.kl")"

# ---- the two scan codes get two different labels --------------------------
# The first candidate is absent from a typical Generic.kl, and a picker that
# skipped list positions rather than matches would then hand both scan codes the
# first match -- leaving Meta left and right indistinguishable to Android, and
# other usable labels unused. The clipboard keys double as the fallback case:
# they are what an application is most likely to act on, so they are only
# reached when the source offers nothing more inert.

mkdir -p "$work/clip/usr/keylayout"
printf 'key 125   META_LEFT\nkey 126   META_RIGHT\nkey 133   COPY\nkey 134   PASTE\n' \
    > "$work/clip/usr/keylayout/Generic.kl"
module_clip="$work/module-clip"
mkdir -p "$module_clip"
run "$module_clip" "$work/clip/usr/keylayout" >/dev/null 2>&1
clip_out="$module_clip/system/usr/keylayout/Vendor_ffff_Product_ffff.kl"
clip_left=$(sed -n 's/^\(key 125.*\)$/\1/p' "$clip_out")
clip_right=$(sed -n 's/^\(key 126.*\)$/\1/p' "$clip_out")
check "clipboard keys used only as a fallback" "key 125   COPY" "$clip_left"
check "and the second scan code gets the second one" "key 126   PASTE" "$clip_right"
if [ "$clip_left" = "$clip_right" ]; then
    bad "both scan codes got the same label: $clip_left"
else
    ok
fi

# ---- nothing reserved is ever chosen ---------------------------------------
# The consumer app resolves these key codes from its own table instead of the
# scan code, so picking one would map the key straight back to the reserved
# Meta and undo the fix.

# Matched as a whole word without \b, which is a GNU extension: toybox and
# busybox grep reject the pattern outright, and a check that errors out passes
# for every label -- on the platform this script actually runs on.
for frozen in META_LEFT META_RIGHT SEARCH ASSIST F13 F24; do
    if grep -qE "^CANDIDATE_LABELS=.*(^|[[:space:]])$frozen([[:space:]]|$)" "$script"; then
        bad "$frozen must not be a substitute label"
    else
        ok
    fi
done

# ---- search order: the first directory holding a Generic.kl wins -----------

mkdir -p "$work/odm/usr/keylayout" "$work/vendor/usr/keylayout" "$work/sys2/usr/keylayout"
write_source "$work/odm/usr/keylayout/Generic.kl"
printf 'key 125   META_LEFT\nkey 126   META_RIGHT\n' > "$work/vendor/usr/keylayout/Generic.kl"
write_source "$work/sys2/usr/keylayout/Generic.kl"

module_order="$work/module-order"
mkdir -p "$module_order"
run "$module_order" "$work/odm/usr/keylayout $work/vendor/usr/keylayout $work/sys2/usr/keylayout" >/dev/null 2>&1
# The vendor copy names only the two Meta lines, so a substitute for it can only
# come from a later directory -- copying it would leave 126 unmapped. Seeing a
# label at all proves the first directory's layout is the one that was used.
check "first matching directory wins" "key 126   KATAKANA_HIRAGANA" \
    "$(sed -n 's/^\(key 126.*\)$/\1/p' "$module_order/system/usr/keylayout/Vendor_ffff_Product_ffff.kl")"

# ---- regeneration is driven by the source, not by the clock ----------------

# Identity and timestamps, not cksum: cksum prints the pathname as well, so it
# is equal whether or not the file was rewritten and this check could not fail.
before=$(stat -c '%i %Y' "$(out)" 2>/dev/null || stat -f '%i %m' "$(out)")
sleep 1
run "$module" "$work/sys/usr/keylayout" >/dev/null 2>&1
check "unchanged source is left alone" "$before" \
    "$(stat -c '%i %Y' "$(out)" 2>/dev/null || stat -f '%i %m' "$(out)")"

# A ROM update replaces Generic.kl; the copy has to follow it or keys the ROM
# added would go missing.
write_source "$work/sys/usr/keylayout/Generic.kl" "key 125   META_LEFT"
printf 'key 30    A\nkey 125   META_LEFT\nkey 126   META_RIGHT\nkey 133   COPY\nkey 135   PASTE\n' \
    > "$work/sys/usr/keylayout/Generic.kl"
run "$module" "$work/sys/usr/keylayout" >/dev/null 2>&1
check "changed source regenerates" "5" "$(wc -l < "$(out)" | tr -d ' ')"

# ---- a label that could not be applied is not recorded as success ----------
# Recording success here is the worst outcome the script can produce: the file
# is unreadable to system_server, Android silently falls back to Generic.kl, and
# the stamp means no later boot ever revisits it.

mkdir -p "$work/labelfail/usr/keylayout"
write_source "$work/labelfail/usr/keylayout/Generic.kl"
module_lf="$work/module-labelfail"
mkdir -p "$module_lf"
GOLD_TEST_CHCON_EXIT=1 run "$module_lf" "$work/labelfail/usr/keylayout" >/dev/null 2>&1
if [ -e "$module_lf/keylayout.stamp" ]; then
    bad "a failed chcon was stamped as success"
else
    ok
fi
if [ -f "$module_lf/system/usr/keylayout/Vendor_ffff_Product_ffff.kl" ]; then
    ok
else
    bad "the layout should still have been written before labelling failed"
fi
# And a later run, with labelling possible again, must notice it is unstamped.
run "$module_lf" "$work/labelfail/usr/keylayout" >/dev/null 2>&1
if [ -f "$module_lf/keylayout.stamp" ]; then
    ok
else
    bad "a recovered run did not stamp the layout"
fi

# ---- a stamp from an older build does not freeze the mapping --------------
# The labels are this script's decision, not the source's. A build that hashed
# only the source would see "nothing changed" and keep whatever mapping it
# generated first, so a device that once mapped 125 to CUT would keep CUT
# forever however the candidate list above changed.

mkdir -p "$work/label/usr/keylayout"
write_source "$work/label/usr/keylayout/Generic.kl"
module_label="$work/module-label"
mkdir -p "$module_label"
run "$module_label" "$work/label/usr/keylayout" >/dev/null 2>&1
label_out="$module_label/system/usr/keylayout/Vendor_ffff_Product_ffff.kl"

# Rewind to what the previous build would have left: an older mapping, and the
# stamp it would have written -- the source hash and nothing else.
sed -i 's/^key 125   BOOKMARK$/key 125   CUT/' "$label_out"
cksum "$work/label/usr/keylayout/Generic.kl" > "$module_label/keylayout.stamp"
run "$module_label" "$work/label/usr/keylayout" >/dev/null 2>&1
check "an old-style stamp does not freeze the mapping" "key 125   BOOKMARK" \
    "$(sed -n 's/^\(key 125.*\)$/\1/p' "$label_out")"

# ---- --check reports and writes nothing ------------------------------------

mkdir -p "$work/check/usr/keylayout"
write_source "$work/check/usr/keylayout/Generic.kl"
module_check="$work/module-check"
mkdir -p "$module_check"
report=$(run "$module_check" "$work/check/usr/keylayout" "--check" 2>&1)
if [ -e "$module_check/system/usr/keylayout/Vendor_ffff_Product_ffff.kl" ]; then
    bad "--check wrote a layout"
else
    ok
fi
case $report in
    *"would map 125 -> BOOKMARK, 126 -> KATAKANA_HIRAGANA"*) ok ;;
    *) bad "--check did not report the mapping: $report" ;;
esac

# ---- a device with nothing to gain is left alone ---------------------------

mkdir -p "$work/nometa/usr/keylayout"
printf 'key 30    A\nkey 133   COPY\n' > "$work/nometa/usr/keylayout/Generic.kl"
module_nometa="$work/module-nometa"
mkdir -p "$module_nometa"
run "$module_nometa" "$work/nometa/usr/keylayout" >/dev/null 2>&1
if [ -e "$module_nometa/system/usr/keylayout/Vendor_ffff_Product_ffff.kl" ]; then
    bad "wrote a layout for a source that names no scan code 125"
else
    ok
fi

# ---- a layout from an earlier identity does not survive --------------------
# It names real hardware's ids, so leaving it would hand our two changed keys to
# that hardware. Changing the ids in fn_remap.c must not leave one behind.

mkdir -p "$module/system/usr/keylayout"
printf 'key 125   META_LEFT\n' > "$module/system/usr/keylayout/Vendor_22d9_Product_386a.kl"
printf 'key 125   META_LEFT\n' > "$module/system/usr/keylayout/Vendor_05ac_Product_0239.kl"
run "$module" "$work/sys/usr/keylayout" >/dev/null 2>&1
if [ -e "$module/system/usr/keylayout/Vendor_22d9_Product_386a.kl" ] \
    || [ -e "$module/system/usr/keylayout/Vendor_05ac_Product_0239.kl" ]; then
    bad "a stale layout for an earlier identity was left in place"
else
    ok
fi
if [ -f "$(out)" ]; then ok; else bad "current layout lost while clearing stale ones"; fi

# ---- an empty search list means search nothing -----------------------------
# With ${VAR:-default} an empty value would silently fall back to the real
# system directories -- the opposite of what an empty list asks for.

module_empty="$work/module-empty"
mkdir -p "$module_empty"
run "$module_empty" "" >/dev/null 2>&1
if [ -e "$module_empty/system/usr/keylayout/Vendor_ffff_Product_ffff.kl" ]; then
    bad "an empty search list still produced a layout"
else
    ok
fi

# ---- a layout spelled less canonically is still recognised -----------------
# Android's parser tolerates leading whitespace and trailing content; a device
# whose Generic.kl is spelled that way must not look like one with no Meta key.

mkdir -p "$work/odd/usr/keylayout"
{
    printf '  key 125   META_LEFT\n'
    printf 'key 126   META_RIGHT   # right meta\n'
    printf 'key 133   COPY\n'
} > "$work/odd/usr/keylayout/Generic.kl"
module_odd="$work/module-odd"
mkdir -p "$module_odd"
run "$module_odd" "$work/odd/usr/keylayout" >/dev/null 2>&1
odd_out="$module_odd/system/usr/keylayout/Vendor_ffff_Product_ffff.kl"
check "indented Meta line rewritten" "key 125   COPY" \
    "$(sed -n 's/^\(key 125.*\)$/\1/p' "$odd_out")"
check "trailing comment dropped with the rewrite" "key 126   COPY" \
    "$(sed -n 's/^\(key 126.*\)$/\1/p' "$odd_out")"

# ---- stale layouts go even when this run cannot replace them ---------------
# The file names real hardware and would rename two of its keys. Having no
# source to build from is not a reason to leave it there.

mkdir -p "$work/nosrc-module/system/usr/keylayout"
printf 'key 125   META_LEFT\n' \
    > "$work/nosrc-module/system/usr/keylayout/Vendor_22d9_Product_386a.kl"
run "$work/nosrc-module" "$work/does-not-exist-2" >/dev/null 2>&1
if [ -e "$work/nosrc-module/system/usr/keylayout/Vendor_22d9_Product_386a.kl" ]; then
    bad "a stale layout survived a run that had no source to replace it with"
else
    ok
fi

# ---- a source with 125 but no 126 reports what it actually wrote -----------

mkdir -p "$work/halfmeta/usr/keylayout"
printf 'key 30    A\nkey 125   META_LEFT\nkey 133   COPY\n' \
    > "$work/halfmeta/usr/keylayout/Generic.kl"
module_half="$work/module-half"
mkdir -p "$module_half"
half_report=$(run "$module_half" "$work/halfmeta/usr/keylayout" 2>&1)
case $half_report in
    *"127"*|*"126 ->"*)
        bad "claimed a 126 mapping for a source that has none: $half_report" ;;
    *) ok ;;
esac
check "the one mapping it did write is there" "key 125   COPY" \
    "$(sed -n 's/^\(key 125.*\)$/\1/p' "$module_half/system/usr/keylayout/Vendor_ffff_Product_ffff.kl")"

# ---- no source at all is not an error --------------------------------------

module_none="$work/module-none"
mkdir -p "$module_none"
run "$module_none" "$work/does-not-exist" >/dev/null 2>&1
check "missing source exits cleanly" "0" "$?"

echo
echo "test_keylayout: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
