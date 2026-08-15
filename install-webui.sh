#!/system/bin/sh
set -eu

MODDIR=/data/adb/modules/Gold_Keyboardremaps
TMPDIR=/data/local/tmp/gold-keyboardremaps

mkdir -p "$MODDIR/bin" "$MODDIR/webroot"
cp "$TMPDIR/fn-remap" "$MODDIR/bin/fn-remap.new"
chmod 755 "$MODDIR/bin/fn-remap.new"
mv "$MODDIR/bin/fn-remap.new" "$MODDIR/bin/fn-remap"
cp "$TMPDIR/keyboardctl" "$MODDIR/bin/keyboardctl.new"
chmod 755 "$MODDIR/bin/keyboardctl.new"
mv "$MODDIR/bin/keyboardctl.new" "$MODDIR/bin/keyboardctl"
cp "$TMPDIR/coloros-window-launcher.jar" "$MODDIR/bin/coloros-window-launcher.jar.new"
chmod 644 "$MODDIR/bin/coloros-window-launcher.jar.new"
mv "$MODDIR/bin/coloros-window-launcher.jar.new" "$MODDIR/bin/coloros-window-launcher.jar"
cp "$TMPDIR/service.sh" "$MODDIR/service.sh.new"
chmod 755 "$MODDIR/service.sh.new"
mv "$MODDIR/service.sh.new" "$MODDIR/service.sh"
cp "$TMPDIR/action.sh" "$MODDIR/action.sh.new"
chmod 755 "$MODDIR/action.sh.new"
mv "$MODDIR/action.sh.new" "$MODDIR/action.sh"
cp "$TMPDIR/webroot/index.html" "$MODDIR/webroot/index.html"
cp "$TMPDIR/webroot/style.css" "$MODDIR/webroot/style.css"
cp "$TMPDIR/webroot/app.js" "$MODDIR/webroot/app.js"

echo "Installed keyboard remapper and KSU WebUI"
