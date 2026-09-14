#!/system/bin/sh
set -eu

MODDIR=/data/adb/modules/Gold_Keyboardremaps
STAGEDIR=/data/local/tmp

if [ ! -d "$MODDIR" ]; then
    echo "Keyboard extension module is not installed" >&2
    exit 1
fi

if [ ! -f "$MODDIR/module.prop.pre-gboard-fix" ]; then
    cp "$MODDIR/module.prop" "$MODDIR/module.prop.pre-gboard-fix"
fi

mkdir -p "$MODDIR/bin"
cp "$STAGEDIR/fn-remap" "$MODDIR/bin/fn-remap.new"
chmod 755 "$MODDIR/bin/fn-remap.new"
mv "$MODDIR/bin/fn-remap.new" "$MODDIR/bin/fn-remap"
cp "$STAGEDIR/keyboardctl" "$MODDIR/bin/keyboardctl.new"
chmod 755 "$MODDIR/bin/keyboardctl.new"
mv "$MODDIR/bin/keyboardctl.new" "$MODDIR/bin/keyboardctl"
cp "$STAGEDIR/coloros-window-launcher.jar" "$MODDIR/bin/coloros-window-launcher.jar.new"
chmod 644 "$MODDIR/bin/coloros-window-launcher.jar.new"
mv "$MODDIR/bin/coloros-window-launcher.jar.new" "$MODDIR/bin/coloros-window-launcher.jar"

cp "$STAGEDIR/service.sh" "$MODDIR/service.sh.new"
chmod 755 "$MODDIR/service.sh.new"
mv "$MODDIR/service.sh.new" "$MODDIR/service.sh"
cp "$STAGEDIR/action.sh" "$MODDIR/action.sh.new"
chmod 755 "$MODDIR/action.sh.new"
mv "$MODDIR/action.sh.new" "$MODDIR/action.sh"

cp "$STAGEDIR/module.prop" "$MODDIR/module.prop.new"
mv "$MODDIR/module.prop.new" "$MODDIR/module.prop"

cp "$STAGEDIR/keylayout.sh" "$MODDIR/keylayout.sh.new"
chmod 755 "$MODDIR/keylayout.sh.new"
mv "$MODDIR/keylayout.sh.new" "$MODDIR/keylayout.sh"

# Retire the old Meta override before the next boot overlay is assembled.
GOLD_MODULE_DIR="$MODDIR" /system/bin/sh "$MODDIR/keylayout.sh"

echo "Installed Gboard-compatible Fn remapper"
