# Gold Keyboard Remaps

Gold Keyboard Remaps 是一个 KernelSU 模块。它拦截指定的 Linux 输入事件，创建虚拟键盘，再把按键转换为单键、组合键或应用启动动作。

## 功能

- 自动识别外接 USB、蓝牙和 HID 键盘，也支持手动选择输入节点。
- 支持单键映射、组合键映射和多个输出键。
- 支持按键捕获，减少手动查找 Linux 按键名称的工作。
- 支持通过组合键启动应用；在 ColorOS 上可选小窗启动和重复按键关闭。
- 提供 KernelSU WebUI，用于查看设备、编辑规则、保存配置和暂停模块。

## 使用前提

- 已获得 root，并安装支持 WebUI 的 KernelSU Manager。
- 设备内核提供 `/dev/uinput`，外接键盘能出现在 `/dev/input/event*`。
- 模块必须包含编译好的 `bin/fn-remap`，并具有 `0755` 权限。
- 只有使用 ColorOS 小窗规则时才需要 `bin/coloros-window-launcher.jar`；普通按键映射和普通应用启动不依赖它。

## 安装

### 普通用户

请使用维护者提供的 KernelSU 模块 ZIP：

1. 打开 KernelSU Manager，进入“模块”。
2. 选择“从存储安装”，选中模块 ZIP。
3. 安装完成后重启设备，并确认模块已启用。
4. 在模块详情中打开 WebUI。

本仓库当前是源码和部署材料，不是完整的可刷入 ZIP。直接压缩仓库根目录会因为缺少 `bin/fn-remap` 而无法运行。

### 维护者打包

最终模块目录至少应包含以下内容：

```text
Gold_Keyboardremaps/
├── module.prop
├── service.sh
├── action.sh
├── config.conf
├── bin/
│   ├── fn-remap
│   ├── keyboardctl
│   └── coloros-window-launcher.jar   # 可选
└── webroot/
    ├── index.html
    ├── app.js
    └── style.css
```

`fn_remap.c` 需要使用 Android 目标架构编译为 `bin/fn-remap`。如果要启用 ColorOS 小窗，需要使用 Android SDK 的 `android.jar` 编译 `ColorOsWindowLauncher.java`，并把生成的类打包为 `bin/coloros-window-launcher.jar`。

仓库中的 `install-webui.sh` 和 `install-into-existing-module.sh` 是刷机后更新现有模块的脚本，不是完整构建系统。它们会从 `/data/local/tmp/gold-keyboardremaps` 或 `/data/local/tmp` 读取已经准备好的二进制和脚本。

### GitHub Actions 手动构建

仓库提供 `.github/workflows/manual-build.yml`。在 GitHub 的 **Actions** 页面选择 “Manual Build and Release”，点击 “Run workflow” 后设置：

- `abi`：选择目标设备架构，默认 `arm64-v8a`；也可构建 `armeabi-v7a` 或 `x86_64`。
- `publish_release`：默认关闭。关闭时只生成 Actions 构建产物；开启时会创建 GitHub Release 并上传 ZIP 和 SHA-256 校验文件。
- `release_tag`：仅发布时需要。留空会生成类似 `v1.0-build.123` 的标签。

每个 ZIP 都只包含一种 ABI，请下载与设备架构一致的文件。

## WebUI 使用

### 1. 选择输入节点

打开“输入节点”并点击“刷新节点”。推荐开启“自动选择外接物理键盘”；如果设备有多个键盘，可以关闭自动模式后手动勾选节点。

触摸屏、触摸板和手写笔会显示为暂不支持，不应选择它们作为键盘输入源。

### 2. 添加单键映射

1. 点击“添加单键”。
2. 在“输入键”中选择一个按键，或点击“捕获按键 5 秒”后按下目标键。
3. 在“输出键”中选择一个或多个按键。
4. 点击“加入规则”，再点击底部“保存并应用”。

### 3. 添加组合键映射

1. 点击“添加组合”。
2. 点击“捕获组合 5 秒”，在倒计时内依次按下组合键。
3. 选择输出键，或打开“键盘视图”进行多选。
4. 点击“加入规则”，再点击“保存并应用”。

输出键中的修饰键会先按下，释放时按相反顺序释放。规则只有在点击“保存并应用”后才会写入配置并重启输入转发器。

### 4. 启动应用

组合键编辑器中点击“打开应用”，刷新并选择应用。可以选择：

- “以小窗形式打开”：需要 ColorOS 和 `coloros-window-launcher.jar`，系统或应用不支持时可能退回普通窗口。
- “再次按下时关闭 App”：再次触发时返回桌面，应用保留在后台。

默认配置包含 `Ctrl + Shift + Z` 启动 QQ 的示例规则。如果设备没有 QQ，请在 WebUI 中删除或修改该规则。

### 5. 暂停和恢复

在 KernelSU 模块详情中点击模块操作按钮即可切换状态。暂停后输入转发器会停止，恢复后会自动重新启动。修改映射前如果担心按键失控，可以先暂停模块。

## 默认映射

首次运行没有配置文件时，模块会自动创建以下规则：

```text
F23                 -> Fn
Fn + 1..0           -> F1..F10
Fn + -              -> F11
Fn + =              -> F12
Ctrl + Shift + Z    -> QQ 小窗（示例）
```

其中 F23 通常是设备厂商上报的功能键，实际名称以“按键捕获”结果为准。

## 手动配置

配置文件位置：

```text
/data/adb/modules/Gold_Keyboardremaps/config.conf
```

支持以下格式：

```ini
version=1

# 自动选择键盘
device=auto

# 手动选择，格式为：设备路径|总线|厂商|产品
device=/dev/input/event9|0019|22d9|3869

# 按键映射
mapping=KEY_F23=>KEY_FN
mapping=KEY_LEFTCTRL+KEY_LEFTSHIFT+KEY_Z=>KEY_C

# 启动应用，mode 为 normal 或 freeform，可选 toggle
launch=KEY_LEFTCTRL+KEY_LEFTSHIFT+KEY_Z=>com.example.app/.MainActivity|normal
launch=KEY_LEFTCTRL+KEY_LEFTSHIFT+KEY_Q=>com.example.app/.MainActivity|freeform|toggle
```

按键之间使用 `+`，输入和输出之间使用 `=>`。每个组合最多 8 个按键。捕获到内置表中没有的按键时，会显示为 `CODE_数字`，可以直接写入映射。

手动修改后，可在 root shell 中重启转发器：

```sh
su -c '/data/adb/modules/Gold_Keyboardremaps/bin/keyboardctl restart'
```

## 故障排查

### WebUI 显示“不可用”

- 确认页面是从 KernelSU Manager 打开的，而不是普通浏览器。
- 确认模块已启用并已重启设备。
- 确认 `bin/fn-remap` 存在且可执行。

### 没有发现输入节点

- 插拔外接键盘后点击“刷新节点”。
- 关闭自动模式并尝试手动选择外接键盘节点。
- 使用 root shell 检查：`getevent -il /dev/input/eventX`。

### 捕获不到按键

捕获只监听当前选中的外接键盘，并且模块不能处于暂停状态。单键模式识别到第一个按键就结束；组合模式会持续监听完整时长。

### 映射没有生效

确认点击了“保存并应用”，状态显示“运行中”，并查看日志：

```text
/data/adb/modules/Gold_Keyboardremaps/fn-remap.log
```

如果日志提示无法创建虚拟键盘，请检查内核是否提供 `/dev/uinput`，以及是否有其他输入拦截模块与本模块冲突。

### 小窗启动失败

小窗功能依赖 ColorOS 的窗口服务、应用支持情况和 `coloros-window-launcher.jar`。普通 AOSP 或非 ColorOS 设备应取消“以小窗形式打开”，改用普通启动。

## 卸载

在 KernelSU Manager 中禁用或卸载模块，然后按提示重启。卸载前建议先暂停模块，并确认外接键盘可以正常输入。

## 许可证与风险

本模块以 root 权限读取并独占选中的输入节点，再通过 uinput 创建虚拟键盘。错误的设备选择或映射可能暂时导致键盘没有响应；首次修改建议保留触摸屏或 adb 作为备用控制方式。
