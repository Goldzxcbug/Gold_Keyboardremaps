#!/system/bin/sh
# Upgrade cleanup: immersive input now reads Gold's evdev output exclusively.
# Android can use Generic.kl again, including its native Meta modifiers.
set -eu
MODULE_DIR=${GOLD_MODULE_DIR:-${0%/*}}
LAYOUT_NAME=Vendor_ffff_Product_ffff.kl
OUT_DIR="$MODULE_DIR/system/usr/keylayout"
check_only=0
[ "${1:-}" = "--check" ] && check_only=1
changed=0

# Only layouts previously generated for Gold; preserve user-owned layouts.
for name in "$LAYOUT_NAME" Vendor_22d9_Product_386a.kl; do
    layout="$OUT_DIR/$name"
    [ -e "$layout" ] || continue
    if [ "$check_only" = 1 ]; then
        echo "gold-keylayout: would remove obsolete $name"
    else
        rm -f "$layout"
        echo "gold-keylayout: removed obsolete $name"
    fi
    changed=1
done

if [ "$check_only" = 0 ]; then
    rm -f "$MODULE_DIR/keylayout.stamp"
fi
if [ "$changed" = 1 ]; then
    echo "gold-keylayout: Android uses its native layout after reboot"
fi
