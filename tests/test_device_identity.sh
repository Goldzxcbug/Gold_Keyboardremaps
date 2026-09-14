#!/bin/sh
# Compare Gold's virtual identity with Anland's raw reader and Settings matcher.
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
consumer_rel=consumers/anland_v5/android_consumer/app/src/main/java/com/anland/consumer
consumer_dir=${ANLAND_CONSUMER_DIR:-}
if [ -z "$consumer_dir" ]; then
    for root in "$repo_dir/../anland" "$repo_dir/anland"; do
        if [ -f "$root/$consumer_rel/GoldKeyboard.java" ]; then
            consumer_dir="$root/$consumer_rel"
            break
        fi
    done
fi
if [ ! -f "$consumer_dir/GoldKeyboard.java" ]; then
    if [ "${ANLAND_CONSUMER_DIR+set}" = set ]; then
        echo 'FAIL: ANLAND_CONSUMER_DIR has no GoldKeyboard.java' >&2
        exit 1
    fi
    echo 'SKIP: matching Anland checkout unavailable; set ANLAND_CONSUMER_DIR'
    exit 0
fi
helper="$consumer_dir/../../../../jni/input_grab.c"
test -f "$helper"
define() {
    sed -n "s/^#define[[:space:]]\{1,\}$2[[:space:]]\{1,\}\(.*\)$/\1/p" "$1"
}
java_value() {
    sed -n "s/^[[:space:]]*static final $1 $2 = \(.*\);$/\1/p" \
        "$consumer_dir/GoldKeyboard.java"
}
for field in VENDOR PRODUCT; do
    gold=$(define "$repo_dir/fn_remap.c" "VIRTUAL_$field")
    native=$(define "$helper" "GOLD_$field")
    java=$(java_value int "GOLD_$field")
    test -n "$gold" && test -n "$native" && test -n "$java"
    test "$((gold))" -ne 0
    test "$((gold))" -eq "$((native))"
    test "$((gold))" -eq "$((java))"
done
prefix=$(define "$repo_dir/fn_remap.c" VIRTUAL_NAME_PREFIX)
test "$prefix" = "$(define "$helper" GOLD_NAME_PREFIX)"
test "$prefix" = "$(java_value String GOLD_NAME_PREFIX)"
echo 'test_device_identity: daemon, exclusive reader and Settings matcher agree'
