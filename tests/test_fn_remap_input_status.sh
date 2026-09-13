#!/bin/sh
# Builds and runs the host test for fn-remap's occupancy snapshot.
#
# The snapshot path is baked in at compile time, so this points it at a scratch
# directory rather than the real module path.
#
# Usage: sh tests/test_fn_remap_input_status.sh
#        CC=clang sh tests/test_fn_remap_input_status.sh

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
: "${CC:=clang}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM

# The daemon's own build uses -Werror; this one deliberately does not, because
# including fn_remap.c leaves most of the daemon unused in this translation unit.
"$CC" -std=c11 -O1 -Wall -Wextra \
    -DINPUT_STATUS_PATH="\"$work/input-status\"" \
    -o "$work/test_input_status" "$repo_dir/tests/test_fn_remap_input_status.c" || {
    echo "FAIL could not build the snapshot test" >&2
    exit 2
}

"$work/test_input_status"
