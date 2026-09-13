#!/bin/sh
# Host test for `keyboardctl latency`.
#
# The reading is only worth showing if it means what it says: the numbers come
# from the daemon measuring its own read-to-write gap, so a reader has no way to
# tell a good figure from a garbled one except by the grammar. Everything here
# is filesystem-only -- no device, no root, no kernel.
#
# Usage: sh tests/test_keyboardctl_latency.sh

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM

module="$work/module"
mkdir -p "$module/bin"
cp "$repo_dir/keyboardctl" "$module/bin/keyboardctl"
chmod 0755 "$module/bin/keyboardctl"

ctl="$module/bin/keyboardctl"
status="$module/latency-status"

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

ready_line() { # count window last min avg max
    printf 'GOLDCTL1\tlatency\tok\tcode=ready\tboot_id=%s\tinstance=%s\tcount=%s\twindow=%s\tlast_us=%s\tmin_us=%s\tavg_us=%s\tmax_us=%s\n' \
        "8f3a1c2e-0000-4000-8000-abcdefabcdef" "0123456789abcdef0123456789abcdef" \
        "$1" "$2" "$3" "$4" "$5" "$6"
}

# Writes $1 as the snapshot file, fresh unless $2 is "stale".
publish() {
    printf '%s' "$1" > "$status"
    if [ "${2:-fresh}" = "stale" ]; then
        touch -d '2 hours ago' "$status" 2>/dev/null || touch -t 200001010000 "$status"
    fi
}

run() {
    sh "$ctl" latency
}

# ---- nothing published yet -------------------------------------------------

rm -f "$status"
check "no snapshot is reported as such" \
    "GOLDCTL1	latency	error	code=no-snapshot" "$(run)"
run >/dev/null 2>&1
[ $? -eq 1 ] && ok || bad "no snapshot should exit non-zero"

# ---- a good reading comes back verbatim ------------------------------------

good="$(ready_line 240 64 52 16 47 412)"
publish "$good"
check "a fresh reading is passed through" "$good" "$(run)"
out="$(run)"; rc=$?
[ "$rc" -eq 0 ] && ok || bad "a fresh reading should exit zero"

# A window with no samples yet is a real state, not a broken one.
empty="$(ready_line 0 0 0 0 0 0)"
publish "$empty"
check "an empty window is still a reading" "$empty" "$(run)"

# ---- the heartbeat is the mtime --------------------------------------------

publish "$good" stale
check "a reading nobody refreshed has aged out" \
    "GOLDCTL1	latency	error	code=stale" "$(run)"

# ---- a reading that is not one is refused ----------------------------------

publish "$(ready_line 240 64 52 16 47 412 | sed 's/^GOLDCTL1\tlatency/GOLDCTL1\tinput-status/')"
check "another snapshot's kind is not this one" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

publish "$(ready_line 240 64 52 16 47 412 | sed 's/code=ready/code=busy/')"
check "an unknown code is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

publish "$(ready_line 240 64 52 16 47 412 | sed 's/$/\textra=1/')"
check "a field added behind the reader's back is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

publish "$(ready_line 240 64 52 16 47 412 | sed 's/min_us=/smallest_us=/')"
check "a renamed field is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

publish "$(ready_line 240 64 52 16 47 412 | sed 's/count=240/count=many/')"
check "a non-numeric count is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

publish "$(ready_line 240 64 52 16 47 412 | sed 's/max_us=412/max_us=-1/')"
check "a negative figure is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

# ---- the three figures have to agree with each other -----------------------
# A window whose minimum exceeds its average, or whose average exceeds its
# maximum, cannot have come from this daemon. Showing it would be showing a
# number that is not a measurement.

publish "$(ready_line 240 64 52 900 47 412)"
check "a minimum above the average is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

publish "$(ready_line 240 64 52 16 500 412)"
check "an average above the maximum is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

# ---- junk in the file is not a reading either ------------------------------

publish "$good
trailing junk"
check "a good line with junk after it is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

printf '' > "$status"
check "an empty file is refused" \
    "GOLDCTL1	latency	error	code=malformed" "$(run)"

echo
echo "test_keyboardctl_latency: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
