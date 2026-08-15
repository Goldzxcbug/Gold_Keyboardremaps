#!/system/bin/sh

MODDIR=${0%/*}
CAPTURE_REQUEST="$MODDIR/capture.request"
PAUSE_REQUEST="$MODDIR/paused"
BASE_DESCRIPTION="通过 Linux 输入事件拦截与虚拟输入技术，为你的键盘添加更多功能。"

update_description() {
    description="【$1】$BASE_DESCRIPTION"
    if [ -x /data/adb/ksud ] && KSU_MODULE=Gold_Keyboardremaps /data/adb/ksud module config set override.description "$description" >/dev/null 2>&1; then
        return 0
    fi

    temporary="$MODDIR/module.prop.service"
    sed "s|^description=.*|description=$description|" "$MODDIR/module.prop" > "$temporary" && mv "$temporary" "$MODDIR/module.prop"
}

while [ "$(getprop sys.boot_completed)" != "1" ]; do
    sleep 1
done

chmod 0755 "$MODDIR/bin/fn-remap" "$MODDIR/bin/keyboardctl" 2>/dev/null || true
/system/bin/sh "$MODDIR/bin/keyboardctl" ensure

if [ -f "$PAUSE_REQUEST" ]; then
    update_description "❌ 已暂停"
else
    update_description "✅ 运行中"
fi

# Keep a small supervisor so WebUI changes can restart only the remapper.
while [ ! -f "$MODDIR/disable" ]; do
    if [ -f "$CAPTURE_REQUEST" ]; then
        sleep 0.1
        continue
    fi
    if [ -f "$PAUSE_REQUEST" ]; then
        sleep 0.2
        continue
    fi
    "$MODDIR/bin/fn-remap" >>"$MODDIR/fn-remap.log" 2>&1
    [ -f "$MODDIR/disable" ] && break
    sleep 1
done
