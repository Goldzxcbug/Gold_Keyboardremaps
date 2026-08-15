const MODDIR = "/data/adb/modules/Gold_Keyboardremaps";
const CONFIG_PATH = `${MODDIR}/config.conf`;
const CONTROL = `/system/bin/sh '${MODDIR}/bin/keyboardctl'`;
const THEME_KEY = "gold_keyboardremaps_theme";

const KEYS = [
  ["KEY_F23", "F23（厂商功能键）"],
  ["KEY_FN", "Fn"],
  ["KEY_ESC", "Esc"],
  ["KEY_F1", "F1"], ["KEY_F2", "F2"], ["KEY_F3", "F3"], ["KEY_F4", "F4"],
  ["KEY_F5", "F5"], ["KEY_F6", "F6"], ["KEY_F7", "F7"], ["KEY_F8", "F8"],
  ["KEY_F9", "F9"], ["KEY_F10", "F10"], ["KEY_F11", "F11"], ["KEY_F12", "F12"],
  ["KEY_F24", "F24"],
  ["KEY_SYSRQ", "Print Screen"], ["KEY_SCROLLLOCK", "Scroll Lock"], ["KEY_PAUSE", "Pause"],
  ["KEY_GRAVE", "`"], ["KEY_1", "1"], ["KEY_2", "2"], ["KEY_3", "3"], ["KEY_4", "4"], ["KEY_5", "5"],
  ["KEY_6", "6"], ["KEY_7", "7"], ["KEY_8", "8"], ["KEY_9", "9"], ["KEY_0", "0"],
  ["KEY_MINUS", "-"], ["KEY_EQUAL", "="], ["KEY_BACKSPACE", "Backspace"],
  ["KEY_TAB", "Tab"], ["KEY_LEFTBRACE", "["], ["KEY_RIGHTBRACE", "]"], ["KEY_BACKSLASH", "\\"],
  ["KEY_ENTER", "Enter"], ["KEY_SEMICOLON", ";"], ["KEY_APOSTROPHE", "'"],
  ["KEY_COMMA", ","], ["KEY_DOT", "."], ["KEY_SLASH", "/"],
  ["KEY_SPACE", "Space"], ["KEY_DELETE", "Delete"],
  ["KEY_LEFTCTRL", "Ctrl Left"], ["KEY_RIGHTCTRL", "Ctrl Right"],
  ["KEY_LEFTSHIFT", "Shift Left"], ["KEY_RIGHTSHIFT", "Shift Right"],
  ["KEY_LEFTALT", "Alt Left"], ["KEY_RIGHTALT", "Alt Right"],
  ["KEY_LEFTMETA", "Meta Left"], ["KEY_RIGHTMETA", "Meta Right"],
  ["KEY_A", "A"], ["KEY_B", "B"], ["KEY_C", "C"], ["KEY_D", "D"], ["KEY_E", "E"],
  ["KEY_F", "F"], ["KEY_G", "G"], ["KEY_H", "H"], ["KEY_I", "I"], ["KEY_J", "J"],
  ["KEY_K", "K"], ["KEY_L", "L"], ["KEY_M", "M"], ["KEY_N", "N"], ["KEY_O", "O"],
  ["KEY_P", "P"], ["KEY_Q", "Q"], ["KEY_R", "R"], ["KEY_S", "S"], ["KEY_T", "T"],
  ["KEY_U", "U"], ["KEY_V", "V"], ["KEY_W", "W"], ["KEY_X", "X"], ["KEY_Y", "Y"],
  ["KEY_Z", "Z"], ["KEY_UP", "Up"], ["KEY_DOWN", "Down"], ["KEY_LEFT", "Left"],
  ["KEY_RIGHT", "Right"], ["KEY_HOME", "Home"], ["KEY_END", "End"],
  ["KEY_PAGEUP", "Page Up"], ["KEY_PAGEDOWN", "Page Down"], ["KEY_INSERT", "Insert"],
  ["KEY_CAPSLOCK", "Caps Lock"], ["KEY_NUMLOCK", "Num Lock"],
  ["KEY_KPSLASH", "Num /"], ["KEY_KPASTERISK", "Num *"], ["KEY_KPMINUS", "Num -"], ["KEY_KPPLUS", "Num +"],
  ["KEY_KP0", "Num 0"], ["KEY_KP1", "Num 1"], ["KEY_KP2", "Num 2"], ["KEY_KP3", "Num 3"],
  ["KEY_KP4", "Num 4"], ["KEY_KP5", "Num 5"], ["KEY_KP6", "Num 6"], ["KEY_KP7", "Num 7"],
  ["KEY_KP8", "Num 8"], ["KEY_KP9", "Num 9"], ["KEY_KPDOT", "Num ."], ["KEY_KPENTER", "Num Enter"],
  ["KEY_VOLUMEUP", "Volume Up"], ["KEY_VOLUMEDOWN", "Volume Down"],
  ["KEY_MUTE", "Mute"], ["KEY_BRIGHTNESSDOWN", "Brightness -"], ["KEY_BRIGHTNESSUP", "Brightness +"],
  ["KEY_PLAYPAUSE", "Play/Pause"],
  ["KEY_NEXTSONG", "Next"], ["KEY_PREVIOUSSONG", "Previous"],
  ["KEY_BACK", "Back"], ["KEY_MENU", "Menu"], ["KEY_SEARCH", "Search"],
];

const key = (code, unit = 1, label = "", shifted = "") => ({ code, unit, label, shifted });
const gap = (unit = 1) => ({ gap: true, unit });

// 按标准全尺寸键盘分区排列，避免把按键视图做成难以辨认的列表。
const PHYSICAL_KEYBOARD = {
  functionRow: [
    key("KEY_ESC"), gap(0.45),
    key("KEY_F1"), key("KEY_F2"), key("KEY_F3"), key("KEY_F4"), gap(0.35),
    key("KEY_F5"), key("KEY_F6"), key("KEY_F7"), key("KEY_F8"), gap(0.35),
    key("KEY_F9"), key("KEY_F10"), key("KEY_F11"), key("KEY_F12"), gap(0.7),
    key("KEY_SYSRQ", 1, "PrtSc"), key("KEY_SCROLLLOCK", 1, "ScrLk"), key("KEY_PAUSE"), gap(0.45),
    key("KEY_BRIGHTNESSDOWN", 1, "Br -"), key("KEY_BRIGHTNESSUP", 1, "Br +"), key("KEY_MUTE"),
  ],
  mainRows: [
    [key("KEY_GRAVE", 1, "`", "~"), key("KEY_1", 1, "1", "!"), key("KEY_2", 1, "2", "@"), key("KEY_3", 1, "3", "#"), key("KEY_4", 1, "4", "$"), key("KEY_5", 1, "5", "%"), key("KEY_6", 1, "6", "^"), key("KEY_7", 1, "7", "&"), key("KEY_8", 1, "8", "*"), key("KEY_9", 1, "9", "("), key("KEY_0", 1, "0", ")"), key("KEY_MINUS", 1, "-", "_"), key("KEY_EQUAL", 1, "=", "+"), key("KEY_BACKSPACE", 2)],
    [key("KEY_TAB", 1.5), key("KEY_Q"), key("KEY_W"), key("KEY_E"), key("KEY_R"), key("KEY_T"), key("KEY_Y"), key("KEY_U"), key("KEY_I"), key("KEY_O"), key("KEY_P"), key("KEY_LEFTBRACE", 1, "[", "{"), key("KEY_RIGHTBRACE", 1, "]", "}"), key("KEY_BACKSLASH", 1.5, "\\", "|")],
    [key("KEY_CAPSLOCK", 1.75, "Caps"), key("KEY_A"), key("KEY_S"), key("KEY_D"), key("KEY_F"), key("KEY_G"), key("KEY_H"), key("KEY_J"), key("KEY_K"), key("KEY_L"), key("KEY_SEMICOLON", 1, ";", ":"), key("KEY_APOSTROPHE", 1, "'", "\""), key("KEY_ENTER", 2.25)],
    [key("KEY_LEFTSHIFT", 2.25, "Shift"), key("KEY_Z"), key("KEY_X"), key("KEY_C"), key("KEY_V"), key("KEY_B"), key("KEY_N"), key("KEY_M"), key("KEY_COMMA", 1, ",", "<"), key("KEY_DOT", 1, ".", ">"), key("KEY_SLASH", 1, "/", "?"), key("KEY_RIGHTSHIFT", 2.75, "Shift")],
    [key("KEY_LEFTCTRL", 1.15, "Ctrl"), key("KEY_LEFTMETA", 1.15, "Meta"), key("KEY_LEFTALT", 1.15, "Alt"), key("KEY_SPACE", 5.75, "Space"), key("KEY_RIGHTALT", 1.15, "Alt"), key("KEY_FN", 1.15, "Fn"), key("KEY_RIGHTMETA", 1.15, "Meta"), key("KEY_MENU", 1.15, "Menu"), key("KEY_RIGHTCTRL", 1.15, "Ctrl")],
  ],
  navigation: [
    { code: "KEY_INSERT", column: 1, row: 1, label: "Ins" },
    { code: "KEY_HOME", column: 2, row: 1, label: "Home" },
    { code: "KEY_PAGEUP", column: 3, row: 1, label: "PgUp" },
    { code: "KEY_DELETE", column: 1, row: 2, label: "Del" },
    { code: "KEY_END", column: 2, row: 2, label: "End" },
    { code: "KEY_PAGEDOWN", column: 3, row: 2, label: "PgDn" },
    { code: "KEY_UP", column: 2, row: 3, label: "Up" },
    { code: "KEY_LEFT", column: 1, row: 4, label: "Left" },
    { code: "KEY_DOWN", column: 2, row: 4, label: "Down" },
    { code: "KEY_RIGHT", column: 3, row: 4, label: "Right" },
  ],
  numpad: [
    { code: "KEY_NUMLOCK", column: "1", row: "1", label: "Num" },
    { code: "KEY_KPSLASH", column: "2", row: "1", label: "/" },
    { code: "KEY_KPASTERISK", column: "3", row: "1", label: "*" },
    { code: "KEY_KPMINUS", column: "4", row: "1", label: "-" },
    { code: "KEY_KP7", column: "1", row: "2", label: "7" },
    { code: "KEY_KP8", column: "2", row: "2", label: "8" },
    { code: "KEY_KP9", column: "3", row: "2", label: "9" },
    { code: "KEY_KPPLUS", column: "4", row: "2 / span 2", label: "+" },
    { code: "KEY_KP4", column: "1", row: "3", label: "4" },
    { code: "KEY_KP5", column: "2", row: "3", label: "5" },
    { code: "KEY_KP6", column: "3", row: "3", label: "6" },
    { code: "KEY_KP1", column: "1", row: "4", label: "1" },
    { code: "KEY_KP2", column: "2", row: "4", label: "2" },
    { code: "KEY_KP3", column: "3", row: "4", label: "3" },
    { code: "KEY_KPENTER", column: "4", row: "4 / span 2", label: "Enter" },
    { code: "KEY_KP0", column: "1 / span 2", row: "5", label: "0" },
    { code: "KEY_KPDOT", column: "3", row: "5", label: "." },
  ],
};

function defaultRules() {
  return [
    { source: ["KEY_F23"], target: ["KEY_FN"] },
    { source: ["KEY_FN", "KEY_1"], target: ["KEY_F1"] },
    { source: ["KEY_FN", "KEY_2"], target: ["KEY_F2"] },
    { source: ["KEY_FN", "KEY_3"], target: ["KEY_F3"] },
    { source: ["KEY_FN", "KEY_4"], target: ["KEY_F4"] },
    { source: ["KEY_FN", "KEY_5"], target: ["KEY_F5"] },
    { source: ["KEY_FN", "KEY_6"], target: ["KEY_F6"] },
    { source: ["KEY_FN", "KEY_7"], target: ["KEY_F7"] },
    { source: ["KEY_FN", "KEY_8"], target: ["KEY_F8"] },
    { source: ["KEY_FN", "KEY_9"], target: ["KEY_F9"] },
    { source: ["KEY_FN", "KEY_0"], target: ["KEY_F10"] },
    { source: ["KEY_FN", "KEY_MINUS"], target: ["KEY_F11"] },
    { source: ["KEY_FN", "KEY_EQUAL"], target: ["KEY_F12"] },
    { type: "app", source: ["KEY_LEFTCTRL", "KEY_LEFTSHIFT", "KEY_Z"], component: "com.tencent.mobileqq/.activity.SplashActivity", freeform: true, closeOnRepeat: true },
  ];
}

const state = {
  auto: false,
  devices: [],
  apps: [],
  selected: new Set(),
  rules: [],
  editor: null,
};

let captureTimer = null;

const $ = (selector) => document.querySelector(selector);

function storedTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "dark" || value === "light" ? value : "auto";
  } catch (_) {
    return "auto";
  }
}

function systemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode) {
  const actual = mode === "auto" ? systemTheme() : mode;
  document.documentElement.dataset.theme = mode === "auto" ? "" : mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = actual === "dark" ? "#101419" : "#f4f6f8";
  const button = $("#themeToggle");
  if (button) {
    button.textContent = `主题：${mode === "auto" ? "跟随系统" : actual === "dark" ? "深色" : "浅色"}`;
    button.title = mode === "auto" ? `跟随系统（当前${actual === "dark" ? "深色" : "浅色"}）` : "点击切换主题";
  }
}

function setTheme(mode) {
  try {
    if (mode === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  } catch (_) {
    // Theme still applies for this page when storage is unavailable.
  }
  applyTheme(mode);
}

function cycleTheme() {
  const current = storedTheme();
  setTheme(current === "auto" ? "dark" : current === "dark" ? "light" : "auto");
}

function html(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function keyLabel(key) {
  const match = KEYS.find(([code]) => code === key);
  return match ? match[1] : key.startsWith("CODE_") ? `捕获键 ${key}` : key;
}

function keyOptions() {
  return KEYS.map(([code, label]) => `<option value="${code}">${html(label)} (${code})</option>`).join("");
}

function keyboardViewLabel(key) {
  if (key === "KEY_F23") return "F23";
  return keyLabel(key);
}

function ensureKeyOptions(element, keys) {
  const existing = new Set([...element.options].map((option) => option.value));
  for (const key of keys) {
    if (existing.has(key)) continue;
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${keyLabel(key)} (${key})`;
    element.append(option);
    existing.add(key);
  }
}

function setNotice(message = "", error = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.toggle("error", error);
}

function setCaptureStatus(message = "", error = false) {
  const status = $("#captureStatus");
  status.textContent = message || "捕获状态：等待开始。点击上方按钮后，在 5 秒内按下外接键盘按键。";
  status.hidden = false;
  status.classList.toggle("error", error);
}

function setStatus(text, level = "pending") {
  const pill = $("#statusPill");
  pill.className = `status-pill ${level}`;
  pill.querySelector("strong").textContent = text;
}

function ksuBridge() {
  if (window.ksu && typeof window.ksu.exec === "function") {
    return window.ksu;
  }
  if (typeof ksu !== "undefined" && typeof ksu.exec === "function") {
    return ksu;
  }
  return null;
}

function exec(command) {
  const bridge = ksuBridge();
  if (!bridge) {
    return Promise.reject(new Error("未检测到 KernelSU WebUI API，请从 KernelSU Manager 打开本页面。"));
  }
  return new Promise((resolve, reject) => {
    const callback = `gold_keyboardremaps_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window[callback] = (errno, stdout, stderr) => {
      delete window[callback];
      if (Number(errno) === 0) {
        resolve({ stdout: stdout || "", stderr: stderr || "" });
      } else {
        reject(new Error(stderr || stdout || `命令失败 (${errno})`));
      }
    };
    try {
      bridge.exec(command, JSON.stringify({}), callback);
    } catch (error) {
      delete window[callback];
      reject(error);
    }
  });
}

function parseConfig(text) {
  state.auto = false;
  state.selected.clear();
  state.rules = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line === "device=auto") {
      state.auto = true;
      continue;
    }
    if (line.startsWith("device=")) {
      state.selected.add(line.slice(7));
      continue;
    }
    if (line.startsWith("mapping=")) {
      const [source, target] = line.slice(8).split("=>");
      if (!source || !target) continue;
      state.rules.push({ type: "keys", source: source.split("+").filter(Boolean), target: target.split("+").filter(Boolean) });
      continue;
    }
    if (line.startsWith("launch=")) {
      const [source, destination] = line.slice(7).split("=>");
      if (!source || !destination) continue;
      const [component, mode = "normal", repeatMode = ""] = destination.split("|");
      if (!component || (mode !== "normal" && mode !== "freeform") || (repeatMode && repeatMode !== "toggle")) continue;
      state.rules.push({ type: "app", source: source.split("+").filter(Boolean), component, freeform: mode === "freeform", closeOnRepeat: repeatMode === "toggle" });
    }
  }
}

function parseDevices(text) {
  const unique = new Map();
  for (const line of text.trim().split(/\r?\n/)) {
    if (!line) continue;
    const [path, bus, vendor, product, name, ...classParts] = line.split("\t");
    const classes = classParts.join("\t");
    if (!path || !bus || !vendor || !product || !name || !classes) continue;
    const id = `${path}|${bus}|${vendor}|${product}`;
    unique.set(id, { id, path, bus, vendor, product, name, classes });
  }
  state.devices = [...unique.values()];
  for (const device of state.devices) {
    if (isUnsupportedDevice(device)) state.selected.delete(device.id);
  }
}

const KNOWN_APP_LABELS = {
  "com.android.settings": "设置",
  "com.android.contacts": "联系人",
  "com.android.mms": "信息",
  "com.android.vending": "Google Play",
  "com.oplus.camera": "相机",
  "com.google.android.inputmethod.latin": "Gboard",
  "com.tencent.mm": "微信",
  "com.tencent.mobileqq": "QQ",
  "com.deepseek.chat": "DeepSeek",
  "com.microsoft.emmx": "Microsoft Edge",
  "com.coolapk.market": "酷安",
  "com.termux": "Termux",
  "me.weishu.kernelsu": "KernelSU",
  "md.obsidian": "Obsidian",
};

function packageNameFromComponent(component) {
  return component.split("/", 1)[0] || component;
}

function readableAppName(component) {
  const packageName = packageNameFromComponent(component);
  if (KNOWN_APP_LABELS[packageName]) return KNOWN_APP_LABELS[packageName];
  const tail = packageName.split(".").at(-1) || packageName;
  return tail.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function appRuleLabel(rule) {
  const app = state.apps.find((item) => item.component === rule.component);
  return app ? app.label : readableAppName(rule.component);
}

function parseApps(text) {
  const unique = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const component = rawLine.trim();
    if (!/^[\w.]+\/[\w.$]+$/.test(component)) continue;
    const packageName = packageNameFromComponent(component);
    unique.set(component, { component, packageName, label: readableAppName(component) });
  }
  state.apps = [...unique.values()].sort((first, second) => first.label.localeCompare(second.label, "zh-CN"));
}

function renderApps(selectedComponent = $("#appTarget").value) {
  const select = $("#appTarget");
  const query = $("#appSearch").value.trim().toLowerCase();
  const visible = state.apps.filter((app) => `${app.label} ${app.packageName} ${app.component}`.toLowerCase().includes(query));
  const options = visible.map((app) => `<option value="${html(app.component)}">${html(app.label)} · ${html(app.packageName)}</option>`);
  if (selectedComponent && !state.apps.some((app) => app.component === selectedComponent)) {
    options.unshift(`<option value="${html(selectedComponent)}">${html(readableAppName(selectedComponent))} · 已安装列表中未找到</option>`);
  }
  select.innerHTML = options.length ? options.join("") : '<option value="" disabled>未找到可启动的应用</option>';
  if (selectedComponent) select.value = selectedComponent;
  if (!select.value && select.options.length) select.selectedIndex = 0;
}

async function refreshApps(selectedComponent = $("#appTarget").value) {
  const button = $("#refreshApps");
  button.disabled = true;
  button.textContent = "读取中";
  try {
    const { stdout } = await exec(`${CONTROL} apps`);
    parseApps(stdout);
    renderApps(selectedComponent);
  } catch (error) {
    setNotice(`读取应用失败：${error.message}`, true);
  } finally {
    button.disabled = false;
    button.textContent = "刷新应用";
  }
}

function deviceCategory(device) {
  const value = `${device.name} ${device.classes}`.toLowerCase();
  if (/pencil|stylus|手写/.test(value)) return "手写笔";
  if (/touchpad|触摸板/.test(value)) return "触摸板";
  if (/touchpanel|touch screen|touchscreen|触摸屏|touch_mt/.test(value)) return "触摸屏";
  if (device.bus.toLowerCase() === "0005" && /KEYBOARD/.test(device.classes) &&
      !/consumer/i.test(value)) return "蓝牙键盘";
  if (/bluetooth|蓝牙/.test(value) && /keyboard|键盘/.test(value)) return "蓝牙键盘";
  if (/keyboard|keypad|kbd|键盘/.test(value) && /external/.test(value)) return "物理键盘";
  if (/consumer control|consumer/.test(value)) return "多媒体按键";
  if (/mouse|鼠标/.test(value)) return "鼠标";
  if (/switch|开关/.test(value)) return "系统开关";
  if (/keyboard|键盘/.test(value)) return "系统按键";
  if (/touch/.test(value)) return "触摸输入";
  return "输入设备";
}

function deviceMeta(device) {
  return device.classes.includes("EXTERNAL") ? "外接设备 · 可用于按键映射" : "系统设备 · 可用于按键映射";
}

function isUnsupportedDevice(device) {
  return ["触摸屏", "触摸板", "手写笔"].includes(deviceCategory(device));
}

function isAutoKeyboard(device) {
  return ["物理键盘", "蓝牙键盘"].includes(deviceCategory(device));
}

function renderDevices() {
  $("#autoSelect").checked = state.auto;
  $("#deviceCount").textContent = `${state.devices.length} 个节点`;
  const list = $("#deviceList");
  if (state.devices.length === 0) {
    list.innerHTML = '<div class="empty-state">未发现可配置的输入节点</div>';
    return;
  }
  const nameCounts = new Map();
  state.devices.forEach((device) => nameCounts.set(device.name, (nameCounts.get(device.name) || 0) + 1));
  const nameIndexes = new Map();
  list.innerHTML = state.devices.map((device) => {
    const index = (nameIndexes.get(device.name) || 0) + 1;
    nameIndexes.set(device.name, index);
    const suffix = nameCounts.get(device.name) > 1 ? `（节点 ${index}）` : "";
    const unsupported = isUnsupportedDevice(device);
    const autoSelected = state.auto && isAutoKeyboard(device);
    const checked = autoSelected || (!state.auto && state.selected.has(device.id));
    const disabled = state.auto || unsupported;
    return `
    <label class="device-row${unsupported ? " unsupported" : ""}">
      <input type="checkbox" data-device-id="${html(device.id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="device-main">
        <span class="device-title"><span class="device-name">${html(device.name)}${suffix}</span><span class="device-category">${html(deviceCategory(device))}</span>${unsupported ? '<span class="device-support">暂不支持</span>' : ""}</span>
        <span class="device-meta">${html(unsupported ? "触摸类设备暂未接入映射引擎" : state.auto && isAutoKeyboard(device) ? "自动模式已选择" : deviceMeta(device))}</span>
      </span>
    </label>
  `;
  }).join("");
}

function chips(keys) {
  return keys.map((key) => `<span class="key-chip" title="${html(key)}">${html(keyLabel(key))}</span>`).join("");
}

function ruleTarget(rule) {
  if (rule.type === "app") {
    return `<span class="app-chip" title="${html(rule.component)}">打开 ${html(appRuleLabel(rule))}</span>${rule.freeform ? '<span class="app-window-chip">小窗</span>' : ""}${rule.closeOnRepeat ? '<span class="app-window-chip">重复关闭</span>' : ""}`;
  }
  return chips(rule.target || []);
}

function renderMappings() {
  const list = $("#mappingList");
  $("#emptyMappings").hidden = state.rules.length !== 0;
  const fnTransform = state.rules.some((rule) => rule.type !== "app" && rule.source.length === 1 && rule.source[0] === "KEY_F23" && rule.target.length === 1 && rule.target[0] === "KEY_FN");
  const fnRules = state.rules.some((rule) => rule.type !== "app" && rule.source.includes("KEY_FN"));
  $("#fnHint").textContent = fnTransform && fnRules
    ? "当前 Fn 预映射：F23（厂商功能键）→ Fn，随后由 Fn 组合规则转换为 F1-F12。"
    : "未检测到 Fn 来源键；添加映射时可点击“捕获按键 5 秒”，然后按下键盘上的 Fn 或目标按键。";
  list.innerHTML = state.rules.map((rule, index) => `
    <div class="mapping-row">
      <div class="mapping-keys">${chips(rule.source)}<span class="mapping-arrow">→</span>${ruleTarget(rule)}</div>
      <div class="button-row">
        <button class="button ghost" type="button" data-edit-rule="${index}">编辑</button>
        <button class="button danger" type="button" data-delete-rule="${index}">删除</button>
      </div>
    </div>
  `).join("");
}

function setSelectValues(element, values) {
  for (const option of element.options) option.selected = values.includes(option.value);
}

function setPanelCollapsed(panel, collapsed) {
  if (!panel) return;
  panel.classList.toggle("is-collapsed", collapsed);
  const toggle = panel.querySelector(":scope > .section-head .panel-toggle");
  if (!toggle) return;
  toggle.textContent = collapsed ? "展开" : "折叠";
  toggle.title = collapsed ? "展开此区域" : "折叠此区域";
  toggle.setAttribute("aria-expanded", String(!collapsed));
}

function setupCollapsiblePanel(panel) {
  if (panel.dataset.collapseReady) return;
  const head = panel.querySelector(":scope > .section-head");
  if (!head) return;
  panel.dataset.collapseReady = "true";
  let actions = head.querySelector(":scope > .section-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "section-actions";
    [...head.children].slice(1).forEach((control) => actions.append(control));
    head.append(actions);
  }
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "button ghost panel-toggle";
  toggle.addEventListener("click", () => setPanelCollapsed(panel, !panel.classList.contains("is-collapsed")));
  actions.append(toggle);
  setPanelCollapsed(panel, true);
}

function configureEditorAction(type, rule = {}) {
  if (!state.editor) return;
  const appRule = type === "app";
  state.editor.type = type;
  $("#keyTargetField").hidden = appRule;
  $("#appTargetField").hidden = !appRule;
  $("#openAppAction").hidden = appRule || state.editor.mode !== "combo";
  $("#useKeyAction").hidden = !appRule;
  const creating = state.editor.index === null;
  $("#editorTitle").textContent = creating ? (appRule ? "新建应用映射" : "新建映射") : (appRule ? "编辑应用映射" : "编辑映射");
  $("#editorMode").textContent = appRule ? "组合键 · 打开应用" : state.editor.mode === "combo" ? "组合键映射" : "单键映射";
  $("#saveRule").textContent = creating ? (appRule ? "加入应用规则" : "加入规则") : (appRule ? "更新应用规则" : "更新规则");
  if (appRule) {
    $("#appSearch").value = "";
    $("#appFreeform").checked = Boolean(rule.freeform);
    $("#appCloseOnRepeat").checked = Boolean(rule.closeOnRepeat);
    renderApps(rule.component || "");
    void refreshApps(rule.component || "");
  }
}

function switchEditorAction(type) {
  if (!state.editor || (type === "app" && state.editor.mode !== "combo")) return;
  const appRule = type === "app"
    ? { component: $("#appTarget").value, freeform: $("#appFreeform").checked, closeOnRepeat: $("#appCloseOnRepeat").checked }
    : {};
  configureEditorAction(type, appRule);
}

function openEditor(mode, index = null, requestedType = "keys") {
  setCaptureStatus();
  const existingRule = index === null ? null : state.rules[index];
  const type = existingRule?.type || requestedType;
  const editorMode = type === "app" ? "combo" : mode;
  state.editor = { mode: editorMode, index, type };
  const rule = existingRule || { source: [], target: [] };
  $("#sourceKeys").innerHTML = keyOptions();
  $("#targetKeys").innerHTML = keyOptions();
  ensureKeyOptions($("#sourceKeys"), rule.source);
  ensureKeyOptions($("#targetKeys"), rule.target || []);
  setSelectValues($("#sourceKeys"), rule.source);
  setSelectValues($("#targetKeys"), rule.target || []);
  const captureLabel = editorMode === "combo" ? "捕获组合 5 秒" : "捕获按键 5 秒";
  $("#captureSource").textContent = captureLabel;
  $("#captureTarget").textContent = captureLabel;
  configureEditorAction(type, rule);
  setPanelCollapsed($("#editor"), false);
  $("#editor").hidden = false;
  $("#editor").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeEditor() {
  if (captureTimer !== null) {
    clearInterval(captureTimer);
    captureTimer = null;
  }
  setCaptureStatus();
  state.editor = null;
  $("#editor").hidden = true;
}

function keyboardButton(definition, selected) {
  const pressed = selected.has(definition.code);
  const size = Number(definition.unit || 1);
  return `
    <button class="keyboard-key${pressed ? " selected" : ""}" type="button"
      data-keyboard-key="${definition.code}" aria-pressed="${pressed}" title="${html(definition.code)}"
      style="--key-unit: ${size}">${keyboardKeyContent(definition)}</button>
  `;
}

function keyboardKeyContent(definition) {
  const label = definition.label || keyboardViewLabel(definition.code);
  if (!definition.shifted) return `<span class="key-glyph">${html(label)}</span>`;
  const combo = `KEY_LEFTSHIFT+${definition.code}`;
  return `<span class="key-glyph-shifted" data-keyboard-combo="${combo}" title="选择 Shift + ${html(label)}">${html(definition.shifted)}</span><span class="key-glyph">${html(label)}</span>`;
}

function keyboardRow(definitions, selected, className = "physical-row") {
  return `<div class="${className}">${definitions.map((definition) => {
    if (definition.gap) return `<span class="keyboard-gap" style="--key-unit: ${Number(definition.unit || 1)}"></span>`;
    return keyboardButton(definition, selected);
  }).join("")}</div>`;
}

function keyboardGrid(definitions, selected, className) {
  return `<div class="${className}">${definitions.map((definition) => {
    const pressed = selected.has(definition.code);
    return `
      <button class="keyboard-key${pressed ? " selected" : ""}" type="button"
        data-keyboard-key="${definition.code}" aria-pressed="${pressed}" title="${html(definition.code)}"
        style="grid-column: ${definition.column}; grid-row: ${definition.row}">${keyboardKeyContent(definition)}</button>
    `;
  }).join("")}</div>`;
}

function renderKeyboardView() {
  const selected = new Set(selectedOptions("#targetKeys"));
  const mainRows = PHYSICAL_KEYBOARD.mainRows
    .map((row) => keyboardRow(row, selected))
    .join("");
  $("#keyboardLayout").innerHTML = `
    <div class="keyboard-surface" aria-label="全尺寸键盘布局">
      ${keyboardRow(PHYSICAL_KEYBOARD.functionRow, selected, "physical-row function-row")}
      <div class="physical-body">
        <div class="physical-main">${mainRows}</div>
        ${keyboardGrid(PHYSICAL_KEYBOARD.navigation, selected, "navigation-grid")}
        ${keyboardGrid(PHYSICAL_KEYBOARD.numpad, selected, "numpad-grid")}
      </div>
    </div>
  `;
  const labels = [...selected].map(keyboardViewLabel);
  $("#keyboardSelection").textContent = labels.length ? `已选择：${labels.join("、")}` : "尚未选择输出键";
}

function openKeyboardView() {
  renderKeyboardView();
  $("#keyboardDialog").hidden = false;
  document.body.classList.add("modal-open");
}

function closeKeyboardView() {
  $("#keyboardDialog").hidden = true;
  document.body.classList.remove("modal-open");
}

function toggleKeyboardKey(key) {
  const selected = new Set(selectedOptions("#targetKeys"));
  if (selected.has(key)) selected.delete(key);
  else selected.add(key);
  ensureKeyOptions($("#targetKeys"), [...selected]);
  setSelectValues($("#targetKeys"), [...selected]);
  renderKeyboardView();
}

function toggleKeyboardCombo(keys) {
  const selected = new Set(selectedOptions("#targetKeys"));
  const remove = keys.every((key) => selected.has(key));
  for (const key of keys) {
    if (remove) selected.delete(key);
    else selected.add(key);
  }
  ensureKeyOptions($("#targetKeys"), [...selected]);
  setSelectValues($("#targetKeys"), [...selected]);
  renderKeyboardView();
}

function selectedOptions(selector) {
  return [...$(selector).selectedOptions].map((option) => option.value);
}

function orderedOutputKeys(keys) {
  const modifiers = new Set([
    "KEY_LEFTCTRL", "KEY_RIGHTCTRL", "KEY_LEFTSHIFT", "KEY_RIGHTSHIFT",
    "KEY_LEFTALT", "KEY_RIGHTALT", "KEY_LEFTMETA", "KEY_RIGHTMETA", "KEY_FN",
  ]);
  return [...keys].sort((first, second) => Number(modifiers.has(second)) - Number(modifiers.has(first)));
}

async function captureKeys(selector) {
  if (!state.editor) return;
  const select = $(selector);
  const buttons = [$("#captureSource"), $("#captureTarget")];
  const activeButton = selector === "#sourceKeys" ? $("#captureSource") : $("#captureTarget");
  const defaultText = activeButton.textContent;
  const collectCombo = state.editor.mode === "combo";
  const captureDescription = collectCombo ? "组合按键，可继续按下其他键" : "按键";
  let remaining = 5;
  const controls = [...buttons, $("#saveRule"), $("#cancelEdit"), $("#saveConfig"), $("#restoreDefaults")];
  controls.forEach((control) => { control.disabled = true; });
  setSelectValues(select, []);
  setCaptureStatus(`已清空旧选择，正在监听${captureDescription}（外接键盘，剩余 ${remaining} 秒）...`);
  activeButton.textContent = `监听中 ${remaining}s`;
  captureTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      activeButton.textContent = `监听中 ${remaining}s`;
      setCaptureStatus(`正在监听${captureDescription}（外接键盘，剩余 ${remaining} 秒）...`);
    } else {
      activeButton.textContent = "读取结果...";
      setCaptureStatus(collectCombo ? "组合监听结束，正在读取捕获结果..." : "监听结束，正在读取捕获结果...");
    }
  }, 1000);
  await new Promise((resolve) => setTimeout(resolve, 100));
  try {
    const { stdout } = await exec(`${CONTROL} capture 5 ${collectCombo ? "combo" : "single"}`);
    const captured = [...new Set(stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
    if (captured.length === 0) {
      setCaptureStatus("本次捕获没有识别到按键，请确认输入节点已选中后重试。", true);
      return;
    }
    ensureKeyOptions(select, captured);
    const values = state.editor.mode === "single" && selector === "#sourceKeys"
      ? captured.slice(0, 1)
      : captured;
    setSelectValues(select, values);
    setCaptureStatus(`已捕获：${values.map(keyLabel).join("、")}。确认后点击“加入规则”。`);
  } catch (error) {
    setCaptureStatus(`捕获失败：${error.message}`, true);
  } finally {
    if (captureTimer !== null) {
      clearInterval(captureTimer);
      captureTimer = null;
    }
    controls.forEach((control) => { control.disabled = false; });
    activeButton.textContent = defaultText;
  }
}

function saveRule() {
  if (!state.editor) return;
  const source = selectedOptions("#sourceKeys");
  if (source.length === 0) {
    setNotice("请至少选择一个输入键。", true);
    return;
  }
  if (state.editor.type === "keys" && state.editor.mode === "single" && source.length !== 1) {
    setNotice("单键映射只能选择一个输入键。", true);
    return;
  }
  let rule;
  if (state.editor.type === "app") {
    const component = $("#appTarget").value;
    if (!component) {
      setNotice("请选择要打开的应用。", true);
      return;
    }
    rule = { type: "app", source, component, freeform: $("#appFreeform").checked, closeOnRepeat: $("#appCloseOnRepeat").checked };
  } else {
    const target = orderedOutputKeys(selectedOptions("#targetKeys"));
    if (target.length === 0) {
      setNotice("请至少选择一个输出键。", true);
      return;
    }
    rule = { type: "keys", source, target };
  }
  if (state.editor.index === null) state.rules.push(rule);
  else state.rules[state.editor.index] = rule;
  closeEditor();
  renderMappings();
  setNotice("规则已更新，保存并应用后生效。");
}

function configText() {
  const lines = ["version=1"];
  if (state.auto) lines.push("device=auto");
  else [...state.selected].forEach((device) => lines.push(`device=${device}`));
  state.rules.forEach((rule) => {
    if (rule.type === "app") {
      const mode = rule.freeform ? "freeform" : "normal";
      const repeatMode = rule.closeOnRepeat ? "|toggle" : "";
      lines.push(`launch=${rule.source.join("+")}=>${rule.component}|${mode}${repeatMode}`);
    } else {
      lines.push(`mapping=${rule.source.join("+")}=>${rule.target.join("+")}`);
    }
  });
  return `${lines.join("\n")}\n`;
}

function base64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function applyConfig(button, busyText, readyText, successMessage) {
  if (!state.auto && state.selected.size === 0) {
    setNotice("请至少选择一个输入节点，或启用自动兼容模式。", true);
    return;
  }
  const payload = base64(configText());
  button.disabled = true;
  button.textContent = busyText;
  try {
    await exec(`printf '%s' '${payload}' | base64 -d > '${CONFIG_PATH}' && ${CONTROL} restart`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await refreshStatus();
    $("#lastApplied").textContent = `已应用 ${new Date().toLocaleTimeString()}`;
    setNotice(successMessage);
  } catch (error) {
    setNotice(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = readyText;
  }
}

function saveConfig() {
  return applyConfig($("#saveConfig"), "应用中", "保存并应用", "配置已保存，输入转发器已重新加载。");
}

async function restoreDefaults() {
  const message = "恢复默认设置会清除当前设备选择和全部自定义映射。是否继续？";
  if (!window.confirm(message)) return;
  state.auto = true;
  state.selected.clear();
  state.rules = defaultRules();
  closeEditor();
  renderDevices();
  renderMappings();
  await applyConfig($("#restoreDefaults"), "恢复中", "恢复默认", "默认设置已恢复，输入转发器已重新加载。");
}

async function refreshStatus() {
  try {
    const { stdout } = await exec(`${CONTROL} status`);
    const status = stdout.trim();
    if (status === "running") {
      setStatus("运行中", "ok");
    } else if (status === "paused") {
      setStatus("已暂停", "pending");
    } else {
      setStatus("已停止", "error");
    }
  } catch (error) {
    setStatus("不可用", "error");
    throw error;
  }
}

async function refreshDevices() {
  const button = $("#refreshDevices");
  button.disabled = true;
  button.textContent = "刷新中";
  try {
    const { stdout } = await exec(`${CONTROL} list`);
    parseDevices(stdout);
    renderDevices();
    setNotice("输入节点已刷新。");
  } catch (error) {
    setNotice(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "刷新节点";
  }
}

async function initialize() {
  try {
    await exec(`${CONTROL} ensure`);
    const [{ stdout: config }, devices] = await Promise.all([
      exec(`cat '${CONFIG_PATH}'`),
      exec(`${CONTROL} list`),
    ]);
    parseConfig(config);
    parseDevices(devices.stdout);
    renderDevices();
    renderMappings();
    await refreshStatus();
  } catch (error) {
    setStatus("不可用", "error");
    setNotice(error.message, true);
  }
}

$("#refreshDevices").addEventListener("click", refreshDevices);
$("#themeToggle").addEventListener("click", cycleTheme);
$("#saveConfig").addEventListener("click", saveConfig);
$("#restoreDefaults").addEventListener("click", restoreDefaults);
$("#addSingle").addEventListener("click", () => openEditor("single"));
$("#addCombo").addEventListener("click", () => openEditor("combo"));
$("#cancelEdit").addEventListener("click", closeEditor);
$("#saveRule").addEventListener("click", saveRule);
$("#captureSource").addEventListener("click", () => captureKeys("#sourceKeys"));
$("#captureTarget").addEventListener("click", () => captureKeys("#targetKeys"));
$("#openAppAction").addEventListener("click", () => switchEditorAction("app"));
$("#useKeyAction").addEventListener("click", () => switchEditorAction("keys"));
$("#refreshApps").addEventListener("click", () => refreshApps());
$("#appSearch").addEventListener("input", () => renderApps());
$("#keyboardView").addEventListener("click", openKeyboardView);
$("#closeKeyboardView").addEventListener("click", closeKeyboardView);
$("#keyboardDone").addEventListener("click", closeKeyboardView);
$("#keyboardDialog").addEventListener("click", (event) => {
  if (event.target === $("#keyboardDialog")) {
    closeKeyboardView();
    return;
  }
  const combo = event.target.closest("[data-keyboard-combo]")?.dataset.keyboardCombo;
  if (combo) {
    toggleKeyboardCombo(combo.split("+"));
    return;
  }
  const key = event.target.closest("[data-keyboard-key]")?.dataset.keyboardKey;
  if (key) toggleKeyboardKey(key);
});
$("#autoSelect").addEventListener("change", (event) => {
  state.auto = event.target.checked;
  renderDevices();
});
$("#deviceList").addEventListener("change", (event) => {
  const id = event.target.dataset.deviceId;
  if (!id) return;
  const device = state.devices.find((item) => item.id === id);
  if (!device || isUnsupportedDevice(device)) return;
  state.auto = false;
  if (event.target.checked) state.selected.add(id);
  else state.selected.delete(id);
  renderDevices();
});
$("#mappingList").addEventListener("click", (event) => {
  const edit = event.target.dataset.editRule;
  const remove = event.target.dataset.deleteRule;
  if (edit !== undefined) {
    const index = Number(edit);
    const rule = state.rules[index];
    openEditor(rule.type === "app" ? "combo" : rule.source.length > 1 ? "combo" : "single", index, rule.type || "keys");
  }
  if (remove !== undefined) {
    state.rules.splice(Number(remove), 1);
    renderMappings();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#keyboardDialog").hidden) closeKeyboardView();
});

document.querySelectorAll(".panel").forEach(setupCollapsiblePanel);
initialize();
applyTheme(storedTheme());
const colorScheme = window.matchMedia?.("(prefers-color-scheme: dark)");
colorScheme?.addEventListener?.("change", () => {
  if (storedTheme() === "auto") applyTheme("auto");
});
