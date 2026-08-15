#!/system/bin/sh
set -eu

OLDMOD=/data/adb/modules/jefferderp.keyboardremaps
NEWMOD=/data/adb/modules/Gold_Keyboardremaps

if [ ! -d "$OLDMOD" ]; then
    echo "Old module directory is missing" >&2
    exit 1
fi
if [ -e "$NEWMOD" ]; then
    echo "New module directory already exists" >&2
    exit 1
fi

mv "$OLDMOD" "$NEWMOD"
cp /data/local/tmp/module.prop "$NEWMOD/module.prop"

echo "Migrated module to Gold_Keyboardremaps"
