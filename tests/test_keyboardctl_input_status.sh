#!/bin/sh
# Host test for `keyboardctl input-status`.
#
# Runs the real script against a fake module directory, so it exercises the
# heartbeat, the strict snapshot grammar and the promise that this subcommand is
# a pure read. Everything here is filesystem-only: no device, no root, no kernel.
#
# Usage: sh tests/test_keyboardctl_input_status.sh

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM

module="$work/module"
mkdir -p "$module/bin"
cp "$repo_dir/keyboardctl" "$module/bin/keyboardctl"
chmod 0755 "$module/bin/keyboardctl"

ctl="$module/bin/keyboardctl"
status="$module/input-status"

boot=8f3a1c2e-0000-4000-8000-abcdefabcdef
instance=0123456789abcdef0123456789abcdef

pass=0
fail=0

ready_line() { # generation count nodes
    printf 'GOLDCTL1\tinput-status\tok\tcode=ready\tboot_id=%s\tgeneration=%s\tinstance=%s\tcount=%s\tnodes=%s' \
        "$boot" "$1" "$instance" "$2" "$3"
}

error_line() {
    printf 'GOLDCTL1\tinput-status\terror\tcode=%s' "$1"
}

# Writes $1 as the snapshot file, fresh unless $2 is "stale".
publish() {
    printf '%s\n' "$1" > "$status"
    if [ "${2:-fresh}" = "stale" ]; then
        touch -d '60 seconds ago' "$status"
    fi
}

report() { # description, expected_exit, expected_output
    description=$1
    want_code=$2
    want_out=$3
    # Invoked through sh, the way the README tells users to call it: the script
    # is written for /system/bin/sh, which does not exist on a build host.
    got_out=$(sh "$ctl" input-status 2>&1)
    got_code=$?
    if [ "$got_code" -eq "$want_code" ] && [ "$got_out" = "$want_out" ]; then
        pass=$((pass + 1))
        printf 'ok   %s\n' "$description"
    else
        fail=$((fail + 1))
        printf 'FAIL %s\n' "$description"
        printf '       expected exit %s: %s\n' "$want_code" "$want_out"
        printf '       actual   exit %s: %s\n' "$got_code" "$got_out"
    fi
}

# ---- absent and unreadable ------------------------------------------------

rm -f "$status"
report "no snapshot at all is an error, not an empty result" \
    1 "$(error_line no-snapshot)"

# ---- the two accepted shapes ----------------------------------------------

occupied=$(ready_line 17 2 'event12,event3')
publish "$occupied"
report "a canonical occupied snapshot passes through verbatim" 0 "$occupied"

empty=$(ready_line 18 0 '-')
publish "$empty"
report "a verified-empty snapshot passes through verbatim" 0 "$empty"

publish "$(ready_line 19 1 'event0')"
report "event0 alone is a legal node" 0 "$(ready_line 19 1 'event0')"

# ---- heartbeat ------------------------------------------------------------

publish "$occupied" stale
report "a snapshot whose heartbeat stopped is stale, not believed" \
    1 "$(error_line stale)"

# ---- strict grammar -------------------------------------------------------

publish "$(ready_line 20 1 'event01')"
report "leading zero is not a node Gold can name" 1 "$(error_line malformed)"

publish "$(ready_line 20 2 'event3,event12')"
report "descending order is rejected" 1 "$(error_line malformed)"

publish "$(ready_line 20 2 'event3,event3')"
report "a repeated node is rejected" 1 "$(error_line malformed)"

publish "$(ready_line 20 3 'event3,event4')"
report "count disagreeing with the node list is rejected" 1 "$(error_line malformed)"

publish "$(ready_line 20 0 'event0')"
report "count=0 must be spelled with a dash" 1 "$(error_line malformed)"

publish "$(ready_line 20 1 '-')"
report "count=1 must list a node" 1 "$(error_line malformed)"

publish "$(ready_line 0 0 '-')"
report "generation must be a positive integer" 1 "$(error_line malformed)"

publish "$(ready_line 20 1 'event3')extra"
report "a second line on the file is rejected" 1 "$(error_line malformed)"

publish "$(printf 'GOLDCTL2\tinput-status\tok\tcode=ready\tboot_id=%s\tgeneration=20\tinstance=%s\tcount=0\tnodes=-' "$boot" "$instance")"
report "an unknown magic is rejected" 1 "$(error_line malformed)"

publish "$(printf 'GOLDCTL1\tinput-status\tok\tcode=busy\tboot_id=%s\tgeneration=20\tinstance=%s\tcount=0\tnodes=-' "$boot" "$instance")"
report "a non-ready code is rejected" 1 "$(error_line malformed)"

publish "$(printf 'GOLDCTL1\tinput-status\tok\tcode=ready\tboot_id=%s\tgeneration=20\tinstance=tooshort\tcount=0\tnodes=-' "$boot")"
report "a short instance token is rejected" 1 "$(error_line malformed)"

publish "$(printf 'GOLDCTL1\tinput-status\tok\tcode=ready\tboot_id=%s\tgeneration=20\tinstance=%s\tcount=0\tnodes=-\textra=1' "$boot" "$instance")"
report "an extra field is rejected" 1 "$(error_line malformed)"

# Reordered fields carry the same values but are not the same snapshot.
publish "$(printf 'GOLDCTL1\tinput-status\tok\tcode=ready\tgeneration=20\tboot_id=%s\tinstance=%s\tcount=0\tnodes=-' "$boot" "$instance")"
report "reordered fields are rejected" 1 "$(error_line malformed)"

# 33 strictly ascending nodes: a well-formed list above the device cap.
many=$(for i in $(seq 0 32); do printf 'event%s\n' "$i"; done | LC_ALL=C sort | paste -sd,)
publish "$(ready_line 21 33 "$many")"
report "more nodes than the helper can hold is rejected" 1 "$(error_line malformed)"

publish "$(ready_line 21 2 'event0,event1')"
report "a list just inside the cap still passes" 0 "$(ready_line 21 2 'event0,event1')"

# ---- the claimed set ------------------------------------------------------

claimed_line() { # generation count nodes claimed
    printf '%s\tclaimed=%s' "$(ready_line "$1" "$2" "$3")" "$4"
}

publish "$(claimed_line 22 1 'event12' 'event12,event9')"
report "a claimed set wider than what is held passes" 0 \
    "$(claimed_line 22 1 'event12' 'event12,event9')"

publish "$(claimed_line 22 1 'event12' '-')"
report "an empty claimed set is a dash" 0 "$(claimed_line 22 1 'event12' '-')"

publish "$(claimed_line 22 1 'event12' 'event9,event12')"
report "a descending claimed set is rejected" 1 "$(error_line malformed)"

publish "$(claimed_line 22 1 'event12' 'event09')"
report "a misspelled claimed node is rejected" 1 "$(error_line malformed)"

publish "$(printf '%s\textra=1' "$(ready_line 22 1 'event12')")"
report "an unrecognised 10th field is rejected" 1 "$(error_line malformed)"

publish "$(printf '%s\tclaimed=-\textra=1' "$(ready_line 22 1 'event12')")"
report "an 11th field is rejected" 1 "$(error_line malformed)"

# ---- the read must not touch anything -------------------------------------

before=$(ls -a "$module" | sort)
sh "$ctl" input-status >/dev/null 2>&1
after=$(ls -a "$module" | sort)
if [ "$before" = "$after" ]; then
    pass=$((pass + 1))
    printf 'ok   input-status leaves no state behind\n'
else
    fail=$((fail + 1))
    printf 'FAIL input-status changed the module directory\n       before: %s\n       after:  %s\n' \
        "$before" "$after"
fi

# A stale snapshot must keep being reported as stale: nothing may refresh it.
publish "$occupied" stale
sh "$ctl" input-status >/dev/null 2>&1
report "a failed read does not refresh the snapshot it rejected" \
    1 "$(error_line stale)"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
