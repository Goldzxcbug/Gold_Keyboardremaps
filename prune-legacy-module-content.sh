#!/system/bin/sh
set -eu

MODDIR=/data/adb/modules/Gold_Keyboardremaps

rm -rf "$MODDIR/system"
rm -f "$MODDIR/uninstall.sh"
rm -f "$MODDIR/update.json"
rm -f "$MODDIR/module.prop.pre-gboard-fix"
