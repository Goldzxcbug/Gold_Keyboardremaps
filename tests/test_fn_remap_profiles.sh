#!/bin/sh
# Builds and runs the host test for mapping profiles.
#
# The config path and the Anland request path are baked in at compile time, so
# this points both at a scratch directory.
#
# Usage: sh tests/test_fn_remap_profiles.sh
#        CC=clang sh tests/test_fn_remap_profiles.sh

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
: "${CC:=clang}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM

# Not -Werror: including fn_remap.c leaves most of the daemon unused here.
"$CC" -std=c11 -O1 -Wall -Wextra \
    -DCONFIG_PATH="\"$work/config.conf\"" \
    -DANLAND_PROFILE_REQUEST="\"$work/anland-profile\"" \
    -o "$work/test_profiles" "$repo_dir/tests/test_fn_remap_profiles.c" || {
    echo "FAIL could not build the profile test" >&2
    exit 2
}

GOLD_TEST_CONFIG="$work/config.conf" GOLD_TEST_REQUEST="$work/anland-profile" \
    "$work/test_profiles"
