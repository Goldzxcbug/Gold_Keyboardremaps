#!/bin/sh
# Host regression tests for profile handoff and evdev input-loss recovery.
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
: "${CC:=clang}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
"$CC" -std=c11 -O1 -Wall -Wextra -o "$work/test_handoff" \
    "$repo_dir/tests/test_fn_remap_handoff.c"
"$work/test_handoff"
