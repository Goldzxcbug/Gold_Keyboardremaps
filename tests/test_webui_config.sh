#!/bin/sh
# Runs the WebUI config round-trip test.
#
# The page reads config.conf, lets the user edit it and writes the whole file
# back, so anything the reader understands and the writer does not is silently
# deleted on the next save. This checks that mapping profiles survive that trip.
#
# Usage: sh tests/test_webui_config.sh

set -u

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
: "${NODE:=node}"

command -v "$NODE" >/dev/null 2>&1 || {
    echo "SKIP node is not installed; cannot run the WebUI config test" >&2
    exit 0
}

exec "$NODE" "$repo_dir/tests/test_webui_config.js" "$repo_dir/webroot/app.js"
