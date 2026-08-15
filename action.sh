#!/system/bin/sh

MODDIR=${0%/*}
PAUSE_REQUEST="$MODDIR/paused"
CAPTURE_REQUEST="$MODDIR/capture.request"
BASE_DESCRIPTION="通过 Linux 输入事件拦截与虚拟输入技术，为你的键盘添加更多功能。"

update_description() {
    description="【$1】$BASE_DESCRIPTION"
    if [ -x /data/adb/ksud ] && KSU_MODULE=Gold_Keyboardremaps /data/adb/ksud module config set override.description "$description" >/dev/null 2>&1; then
        return 0
    fi

    temporary="$MODDIR/module.prop.action"
    sed "s|^description=.*|description=$description|" "$MODDIR/module.prop" > "$temporary" && mv "$temporary" "$MODDIR/module.prop"
}

if [ -f "$CAPTURE_REQUEST" ]; then
    echo "正在捕获按键，请等待捕获结束后再切换映射。"
    exit 0
fi

if [ -f "$PAUSE_REQUEST" ]; then
    rm -f "$PAUSE_REQUEST"
    "$MODDIR/bin/keyboardctl" restart
    update_description "✅ 运行中"
    echo "按键映射已启用。"
else
    : > "$PAUSE_REQUEST"
    pkill -TERM -x fn-remap 2>/dev/null || true
    update_description "❌ 已暂停"
    echo "按键映射已暂停；再次点击操作按钮即可恢复。"
fi
