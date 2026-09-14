#!/system/bin/sh
# Preserve every saved profile, including the user's dedicated Anland rules.
CURRENT_MODULE_DIR=${GOLD_CURRENT_MODULE_DIR:-/data/adb/modules/Gold_Keyboardremaps}
if [ -f "$CURRENT_MODULE_DIR/config.conf" ] && [ "$CURRENT_MODULE_DIR" != "$MODPATH" ]; then
    cp -p "$CURRENT_MODULE_DIR/config.conf" "$MODPATH/config.conf" ||
        abort "Could not preserve keyboard mapping profiles"
fi
# Remove the former global Meta override before the next boot's overlay.
ui_print "- Restoring native Android keyboard layouts"
set_perm "$MODPATH/keylayout.sh" 0 0 0755
GOLD_MODULE_DIR="$MODPATH" sh "$MODPATH/keylayout.sh" ||
    abort "Could not remove the obsolete keyboard layout"
