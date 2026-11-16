#!/bin/sh
# Host regression test for ordinary keys that also appear in key-mapping chords.
#
# The daemon includes Linux input headers, so this test is intended for a
# Linux host or the GitHub Actions runner, like the other fn-remap host tests.
#
# Usage: sh tests/test_fn_remap_repeat.sh
#        CC=clang sh tests/test_fn_remap_repeat.sh

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
: "${CC:=clang}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM

# Not -Werror: including fn_remap.c leaves most of the daemon unused here.
"$CC" -std=c11 -O1 -Wall -Wextra \
    -o "$work/test_repeat" "$repo_dir/tests/test_fn_remap_repeat.c" || {
    echo "FAIL could not build the repeat test" >&2
    exit 2
}

"$work/test_repeat"
