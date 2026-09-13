const MODDIR = "/data/adb/modules/Gold_Keyboardremaps";
const CONFIG_PATH = `${MODDIR}/config.conf`;
const CONTROL = `/system/bin/sh '${MODDIR}/bin/keyboardctl'`;
const THEME_KEY = "gold_keyboardremaps_theme";

// Mapping profiles. A config from before profiles existed has no sections at
// all; its rules are the user's real mapping, so they are read into 方案一
// rather than an invisible default nobody can pick.
const MIGRATED_PROFILE = "方案一";
const FIXED_PROFILES = ["方案一", "方案二", "方案三"];
const ANLAND_PROFILE = "Anland";
// Rules that appear before the first profile= line keep this name, which is
// what the daemon calls the implicit section.
const DEFAULT_PROFILE = "默认";

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
  // Always the rule array of the profile in activeProfile. Every other part of
  // this file edits state.rules, so switching profiles is just a change of
  // which array that name points at -- there is no second code path to keep in
  // step with the first.
  rules: [],
  profiles: [],
  activeProfile: MIGRATED_PROFILE,
  editor: null,
  mappingUi: {
    expanded: false,
    addOpen: false,
    draft: null,
  },
};

function cloneRule(rule) {
  return {
    ...rule,
    source: [...rule.source],
    target: rule.target ? [...rule.target] : rule.target,
  };
}

function profileNamed(name) {
  let profile = state.profiles.find((entry) => entry.name === name);
  if (!profile) {
    profile = { name, rules: [] };
    state.profiles.push(profile);
  }
  return profile;
}

/** Makes `name` the profile the mapping list shows and edits. */
function useProfile(name) {
  const profile = profileNamed(name);
  state.activeProfile = profile.name;
  state.rules = profile.rules;
  return profile;
}

/** Replaces the active profile's rules, keeping state.rules pointing at them. */
function replaceActiveRules(rules) {
  const profile = profileNamed(state.activeProfile);
  profile.rules = rules;
  state.rules = profile.rules;
}

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
  state.profiles = [];

  // Rules are collected per section while reading, then handed to the state at
  // the end: the config may name its active profile before, after, or in the
  // middle of the sections it applies to.
  const sections = new Map();
  let loose = [];
  let current = null;
  let activeName = null;

  const ruleSink = () => (current === null ? loose : current);

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("profile=")) {
      const name = line.slice(8).trim();
      if (!name) continue;
      if (!sections.has(name)) sections.set(name, []);
      current = sections.get(name);
      continue;
    }
    if (line.startsWith("active_profile=")) {
      activeName = line.slice(15).trim() || null;
      continue;
    }
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
      ruleSink().push({ type: "keys", source: source.split("+").filter(Boolean), target: target.split("+").filter(Boolean) });
      continue;
    }
    if (line.startsWith("launch=")) {
      const [source, destination] = line.slice(7).split("=>");
      if (!source || !destination) continue;
      const [component, mode = "normal", repeatMode = ""] = destination.split("|");
      if (!component || (mode !== "normal" && mode !== "freeform") || (repeatMode && repeatMode !== "toggle")) continue;
      ruleSink().push({ type: "app", source: source.split("+").filter(Boolean), component, freeform: mode === "freeform", closeOnRepeat: repeatMode === "toggle" });
      continue;
    }
    if (line.startsWith("shell=")) {
      const [source, destination] = line.slice(6).split("=>");
      if (!source || !destination) continue;
      const separator = destination.indexOf("|");
      if (separator < 0) continue;
      const mode = destination.slice(0, separator).trim();
      let command = destination.slice(separator + 1);
      if (command.startsWith("b64:")) {
        try {
          command = decodeBase64(command.slice(4));
        } catch (_) {
          continue;
        }
      }
      if (!command.trim() || (mode !== "shell" && mode !== "root")) continue;
      ruleSink().push({ type: "shell", source: source.split("+").filter(Boolean), shellCommand: command, shellRunAsRoot: mode === "root" });
      continue;
    }
    if (line.startsWith("screenshot=")) {
      const [source, mode] = line.slice(11).split("=>");
      if (!source || !["normal", "long", "area"].includes(mode)) continue;
      ruleSink().push({ type: "screenshot", source: source.split("+").filter(Boolean), screenshotMode: mode });
    }
  }

  // A config written before profiles existed has no sections at all. Those
  // rules are the user's real mapping, so they become 方案一 -- leaving them in
  // an unnamed section would hide them behind a profile nobody could select.
  if (sections.size === 0) {
    sections.set(MIGRATED_PROFILE, loose);
    loose = [];
    activeName = activeName || MIGRATED_PROFILE;
  } else if (loose.length) {
    sections.set(DEFAULT_PROFILE, loose);
  }

  FIXED_PROFILES.forEach((name) => {
    if (!sections.has(name)) sections.set(name, []);
  });

  // The Anland profile starts as a copy of 方案一: "keep my normal mapping and
  // change a few keys while immersive" is what it is for, and an empty one
  // would silently stop every mapping the moment immersive mode starts.
  if (!sections.has(ANLAND_PROFILE)) {
    sections.set(ANLAND_PROFILE, sections.get(MIGRATED_PROFILE).map(cloneRule));
  }

  state.profiles = [...sections].map(([name, rules]) => ({ name, rules }));
  const fallback = state.profiles.some((profile) => profile.name === activeName)
    ? activeName
    : state.profiles[0].name;
  useProfile(fallback);
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

function screenshotLabel(mode) {
  return ({ normal: "截屏", long: "长截屏", area: "区域截屏" })[mode] || "截屏";
}

function ruleTarget(rule) {
  if (rule.type === "app") {
    return `<span class="app-chip" title="${html(rule.component)}">打开 ${html(appRuleLabel(rule))}</span>${rule.freeform ? '<span class="app-window-chip">小窗</span>' : ""}${rule.closeOnRepeat ? '<span class="app-window-chip">重复关闭</span>' : ""}`;
  }
  if (rule.type === "shell") {
    const command = String(rule.shellCommand || "").replace(/\s+/g, " ").trim();
    const label = command.length > 72 ? `${command.slice(0, 69)}...` : command;
    return `<span class="shell-chip" title="${html(rule.shellCommand || "")}">执行 ${html(label)}</span><span class="app-window-chip">${rule.shellRunAsRoot ? "root" : "shell"}</span>`;
  }
  if (rule.type === "screenshot") {
    return `<span class="app-chip">${html(screenshotLabel(rule.screenshotMode))}</span>`;
  }
  return chips(rule.target || []);
}

function renderProfileSelect() {
  const select = $("#profileSelect");
  if (!select) return;
  select.innerHTML = state.profiles
    .map((profile) => {
      const chosen = profile.name === state.activeProfile ? " selected" : "";
      return `<option value="${html(profile.name)}"${chosen}>${html(profile.name)}（${profile.rules.length} 条）</option>`;
    })
    .join("");
  const note = $("#profileNote");
  if (note) {
    note.textContent = state.activeProfile === ANLAND_PROFILE
      ? "进入沉浸模式时自动使用"
      : "";
  }
}

function switchProfile(name) {
  if (!name || name === state.activeProfile) return;
  useProfile(name);
  // An editor opened against the old profile would write its rule into the new
  // one, which is exactly the cross-contamination profiles exist to prevent.
  state.editor = null;
  state.mappingUi.addOpen = false;
  state.mappingUi.draft = null;
  closeEditor();
  renderMappings();
  setNotice(`已切到「${name}」，保存并应用后生效。`);
}

function renderMappings() {
  renderProfileSelect();
  const list = $("#mappingList");
  $("#emptyMappings").hidden = state.rules.length !== 0;
  const fnTransform = state.rules.some((rule) => rule.type === "keys" && rule.source.length === 1 && rule.source[0] === "KEY_F23" && rule.target.length === 1 && rule.target[0] === "KEY_FN");
  const fnRules = state.rules.some((rule) => rule.type === "keys" && rule.source.includes("KEY_FN"));
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
  updateMappingPanel();
}

function updateMappingPanel() {
  const panel = $("#mappingPanel");
  const toggle = $("#toggleMappings");
  const addPanel = $("#mappingAddPanel");
  const rulesPanel = $("#mappingRulesPanel");
  if (!panel || !toggle || !addPanel || !rulesPanel) return;
  panel.classList.toggle("is-collapsed", !state.mappingUi.expanded && !state.mappingUi.addOpen);
  toggle.textContent = state.mappingUi.expanded ? "收起" : "展开";
  toggle.title = state.mappingUi.expanded ? "收起映射规则" : "展开映射规则";
  toggle.setAttribute("aria-expanded", String(state.mappingUi.expanded));
  addPanel.hidden = !state.mappingUi.addOpen;
  rulesPanel.hidden = !state.mappingUi.expanded;
  panel.classList.toggle("has-add-panel", state.mappingUi.addOpen);
  document.querySelectorAll("[data-add-role]").forEach((option) => {
    option.classList.remove("selected");
    option.removeAttribute("aria-pressed");
  });
  const draft = state.mappingUi.draft;
  if (!draft) return;
  const sourceOption = document.querySelector(`[data-add-role="source"][data-add-mode="${draft.sourceMode || ""}"]`);
  const targetOption = document.querySelector(`[data-add-role="target"][data-add-type="${draft.targetType === "screenshot" ? "app" : draft.targetType || ""}"]`);
  [sourceOption, targetOption].forEach((option) => {
    if (!option) return;
    option.classList.add("selected");
    option.setAttribute("aria-pressed", "true");
  });
  const labels = {
    "source-single": draft.sourceMode === "single" && draft.source?.length ? `已选：${draft.source.map(keyLabel).join("、")}` : "选择一个输入按键",
    "source-combo": draft.sourceMode === "combo" && draft.source?.length ? `已选：${draft.source.map(keyLabel).join("、")}` : "选择多个输入按键",
    "target-keys": draft.targetType === "keys" && draft.target?.length ? `已选：${draft.target.map(keyLabel).join("、")}` : "选择输出按键",
    "target-app": draft.targetType === "app" && draft.component
      ? `已选：${readableAppName(draft.component)}`
      : draft.targetType === "screenshot" && draft.screenshotMode
        ? `已选：ColorOS ${screenshotLabel(draft.screenshotMode)}`
        : "选择要打开的应用",
    "target-shell": draft.targetType === "shell" && draft.shellCommand ? `已选：${draft.shellCommand.replace(/\s+/g, " ").trim().slice(0, 42)}` : "编辑要执行的命令",
  };
  document.querySelectorAll("[data-add-selection]").forEach((element) => {
    element.textContent = labels[element.dataset.addSelection] || element.textContent;
  });
  const ready = Boolean(draft.source?.length && draft.targetType && (
    draft.targetType === "keys" ? draft.target?.length :
      draft.targetType === "app" ? draft.component :
        draft.targetType === "screenshot" ? draft.screenshotMode : draft.shellCommand?.trim()
  ));
  $("#draftStatus").textContent = ready ? "输入和功能已完成，可以保存规则" : "请先选择输入按键和功能";
  $("#saveDraftRule").disabled = !ready;
}

function openAddMapping() {
  state.mappingUi.expanded = false;
  state.mappingUi.addOpen = true;
  state.mappingUi.draft = { sourceMode: null, source: [], targetType: null, target: [], component: "", freeform: false, closeOnRepeat: false, shellCommand: "", shellRunAsRoot: false, screenshotMode: "" };
  updateMappingPanel();
  $("#mappingAddPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeAddMapping() {
  state.mappingUi.addOpen = false;
  state.mappingUi.expanded = false;
  state.mappingUi.draft = null;
  updateMappingPanel();
}

function chooseMappingPart(option) {
  const role = option.dataset.addRole;
  const mode = option.dataset.addMode || "single";
  const type = role === "target" ? option.dataset.addType : "keys";
  const draft = state.mappingUi.draft || { sourceMode: null, source: [], targetType: null, target: [], component: "", freeform: false, closeOnRepeat: false, shellCommand: "", shellRunAsRoot: false, screenshotMode: "" };
  state.mappingUi.draft = draft;
  if (role === "source") {
    draft.sourceMode = mode;
    openEditor(mode, null, "keys", "source");
  } else {
    draft.targetType = type;
    if (type === "screenshot") {
      draft.screenshotMode = option.dataset.screenshotMode || "normal";
    }
    openEditor(draft.sourceMode || "single", null, type, "target");
  }
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
  const shellRule = type === "shell";
  const screenshotRule = type === "screenshot";
  const draftPart = state.editor.draftPart;
  state.editor.type = type;
  if (screenshotRule) {
    state.editor.appMode = "coloros";
    state.editor.pendingScreenshotMode = rule.screenshotMode || state.editor.pendingScreenshotMode || "";
  } else if (appRule && !state.editor.appMode) {
    state.editor.appMode = "app";
  }
  const appEditor = appRule || screenshotRule;
  const colorOsMode = appEditor && state.editor.appMode === "coloros";
  $("#sourceKeyField").hidden = draftPart === "target";
  $("#keyTargetField").hidden = appEditor || shellRule || draftPart === "source";
  $("#appTargetField").hidden = !appEditor || draftPart === "source";
  $("#shellTargetField").hidden = !shellRule || draftPart === "source";
  $("#appModePanel").hidden = !appEditor || colorOsMode;
  $("#colorOsModePanel").hidden = !appEditor || !colorOsMode;
  $("#appModeToggle").hidden = !appEditor || draftPart === "source";
  $("#appTargetHeading").textContent = colorOsMode ? "ColorOS 专属" : "打开应用";
  $("#appModeToggle").textContent = colorOsMode ? "打开应用" : "ColorOS 专属";
  $("#appModeToggle").classList.remove("selected");
  $("#appModeToggle").setAttribute("aria-pressed", String(colorOsMode));
  $("#refreshApps").hidden = !appEditor || colorOsMode;
  document.querySelectorAll("[data-coloros-screenshot]").forEach((button) => {
    const selected = colorOsMode && button.dataset.colorosScreenshot === state.editor.pendingScreenshotMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const creating = state.editor.index === null;
  $("#editorTitle").textContent = draftPart === "source"
    ? (state.editor.mode === "combo" ? "选择组合输入" : "选择单键输入")
    : draftPart === "target"
      ? (appEditor ? (colorOsMode ? "选择 ColorOS 功能" : "选择打开应用") : shellRule ? "编辑 Shell 命令" : "选择按键输出")
      : creating ? (appEditor ? (colorOsMode ? "新建 ColorOS 规则" : "新建应用映射") : shellRule ? "新建 Shell 规则" : "新建映射") : (appEditor ? (colorOsMode ? "编辑 ColorOS 规则" : "编辑应用映射") : shellRule ? "编辑 Shell 规则" : "编辑映射");
  $("#editorMode").textContent = appEditor
    ? `${state.editor.mode === "combo" ? "组合键" : "单键"} · ${colorOsMode ? "ColorOS 专属" : "打开应用"}`
    : shellRule
      ? `${state.editor.mode === "combo" ? "组合键" : "单键"} · Shell 命令`
      : state.editor.mode === "combo" ? "组合键映射" : "单键映射";
  $("#saveRule").textContent = state.editor?.draftPart
    ? "完成选择"
    : creating
      ? (appEditor ? (colorOsMode ? "完成选择" : "加入应用规则") : shellRule ? "加入 Shell 规则" : "加入规则")
      : (appEditor ? (colorOsMode ? "完成选择" : "更新应用规则") : shellRule ? "更新 Shell 规则" : "更新规则");
  if (shellRule) {
    $("#shellCommand").value = rule.shellCommand || "";
    $("#shellRunAsRoot").checked = Boolean(rule.shellRunAsRoot);
    $("#shellTestOutput").hidden = true;
  }
  if (appRule && !colorOsMode) {
    $("#appSearch").value = "";
    $("#appFreeform").checked = Boolean(rule.freeform);
    $("#appCloseOnRepeat").checked = Boolean(rule.closeOnRepeat);
    renderApps(rule.component || "");
    void refreshApps(rule.component || "");
  }
}

function toggleAppEditorMode() {
  if (!state.editor || (state.editor.type !== "app" && state.editor.type !== "screenshot")) return;
  const enteringColorOs = state.editor.appMode !== "coloros";
  state.editor.appMode = enteringColorOs ? "coloros" : "app";
  state.editor.type = enteringColorOs ? "screenshot" : "app";
  configureEditorAction(state.editor.type, {
    component: $("#appTarget").value,
    freeform: $("#appFreeform").checked,
    closeOnRepeat: $("#appCloseOnRepeat").checked,
    screenshotMode: state.editor.pendingScreenshotMode,
  });
}

function chooseColorOsScreenshot(mode) {
  if (!["normal", "long", "area"].includes(mode)) return;
  if (!state.editor) return;
  state.editor.pendingScreenshotMode = mode;
  configureEditorAction("screenshot", { screenshotMode: mode });
}

function openEditor(mode, index = null, requestedType = "keys", draftPart = "") {
  setCaptureStatus();
  const existingRule = index === null ? null : state.rules[index];
  const type = existingRule?.type || requestedType;
  const editorMode = mode;
  state.editor = { mode: editorMode, index, type, draftPart };
  const draft = state.mappingUi.draft;
  const rule = existingRule || (draftPart === "source"
    ? { source: draft?.source || [], target: [] }
    : draftPart === "target" && type === "app"
      ? { source: draft?.source || [], target: [], component: draft?.component || "", freeform: draft?.freeform, closeOnRepeat: draft?.closeOnRepeat }
    : draftPart === "target" && type === "shell"
        ? { source: draft?.source || [], shellCommand: draft?.shellCommand || "", shellRunAsRoot: draft?.shellRunAsRoot }
      : draftPart === "target" && type === "screenshot"
        ? { source: draft?.source || [], screenshotMode: draft?.screenshotMode || "normal" }
      : { source: draft?.source || [], target: draft?.target || [] });
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
  $("#ruleArrow").hidden = Boolean(draftPart);
  $("#editor").classList.toggle("draft-editor", Boolean(draftPart));
  setPanelCollapsed($("#editor"), false);
  $("#editor").hidden = false;
  $("#editor").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeEditor() {
  const draftPart = state.editor?.draftPart;
  if (captureTimer !== null) {
    clearInterval(captureTimer);
    captureTimer = null;
  }
  setCaptureStatus();
  state.editor = null;
  $("#editor").hidden = true;
  $("#editor").classList.remove("draft-editor");
  $("#ruleArrow").hidden = false;
  $("#sourceKeyField").hidden = false;
  if (draftPart) {
    state.mappingUi.expanded = false;
    state.mappingUi.addOpen = true;
    updateMappingPanel();
    $("#mappingAddPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
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

function saveDraftPart() {
  if (!state.editor?.draftPart || !state.mappingUi.draft) return;
  const draft = state.mappingUi.draft;
  if (state.editor.draftPart === "source") {
    const source = selectedOptions("#sourceKeys");
    if (source.length === 0) {
      setNotice("请至少选择一个输入键。", true);
      return;
    }
    if (state.editor.mode === "single" && source.length !== 1) {
      setNotice("单键只能选择一个输入键。", true);
      return;
    }
    draft.sourceMode = state.editor.mode;
    draft.source = source;
  } else if (state.editor.type === "app") {
    const component = $("#appTarget").value;
    if (!component) {
      setNotice("请选择要打开的应用。", true);
      return;
    }
    draft.targetType = "app";
    draft.component = component;
    draft.freeform = $("#appFreeform").checked;
    draft.closeOnRepeat = $("#appCloseOnRepeat").checked;
  } else if (state.editor.type === "shell") {
    const shellCommand = $("#shellCommand").value.trim();
    if (!shellCommand) {
      setNotice("请输入要执行的 Shell 命令。", true);
      return;
    }
    if (new TextEncoder().encode(shellCommand).length > 640) {
      setNotice("Shell 命令过长，请控制在 640 字节以内。", true);
      return;
    }
    draft.targetType = "shell";
    draft.shellCommand = shellCommand;
    draft.shellRunAsRoot = $("#shellRunAsRoot").checked;
  } else if (state.editor.type === "screenshot") {
    if (!["normal", "long", "area"].includes(state.editor.pendingScreenshotMode)) {
      setNotice("请选择一个 ColorOS 截图功能。", true);
      return;
    }
    draft.targetType = "screenshot";
    draft.screenshotMode = state.editor.pendingScreenshotMode;
  } else {
    const target = orderedOutputKeys(selectedOptions("#targetKeys"));
    if (target.length === 0) {
      setNotice("请至少选择一个输出键。", true);
      return;
    }
    draft.targetType = "keys";
    draft.target = target;
  }
  closeEditor();
  setNotice("已完成当前选择，请继续选择另一侧。");
}

function saveDraftRule() {
  const draft = state.mappingUi.draft;
  const hasTarget = draft?.targetType === "keys"
    ? draft.target?.length
    : draft?.targetType === "app"
      ? draft.component
      : draft?.targetType === "screenshot"
        ? draft.screenshotMode
        : draft?.targetType === "shell" && draft.shellCommand?.trim();
  if (!draft?.source?.length || !hasTarget) {
    setNotice("请先完成输入按键和功能选择。", true);
    return;
  }
  const rule = draft.targetType === "app"
    ? { type: "app", source: draft.source, component: draft.component, freeform: draft.freeform, closeOnRepeat: draft.closeOnRepeat }
    : draft.targetType === "shell"
      ? { type: "shell", source: draft.source, shellCommand: draft.shellCommand.trim(), shellRunAsRoot: draft.shellRunAsRoot }
      : draft.targetType === "screenshot"
        ? { type: "screenshot", source: draft.source, screenshotMode: draft.screenshotMode }
      : { type: "keys", source: draft.source, target: orderedOutputKeys(draft.target) };
  state.rules.push(rule);
  state.mappingUi.draft = null;
  state.mappingUi.addOpen = false;
  state.mappingUi.expanded = true;
  renderMappings();
  setNotice("规则已添加，保存并应用后生效。");
}

function saveRule() {
  if (!state.editor) return;
  if (state.editor.draftPart) {
    saveDraftPart();
    return;
  }
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
  } else if (state.editor.type === "shell") {
    const shellCommand = $("#shellCommand").value.trim();
    if (!shellCommand) {
      setNotice("请输入要执行的 Shell 命令。", true);
      return;
    }
    if (new TextEncoder().encode(shellCommand).length > 640) {
      setNotice("Shell 命令过长，请控制在 640 字节以内。", true);
      return;
    }
    rule = { type: "shell", source, shellCommand, shellRunAsRoot: $("#shellRunAsRoot").checked };
  } else if (state.editor.type === "screenshot") {
    if (!["normal", "long", "area"].includes(state.editor.pendingScreenshotMode)) {
      setNotice("请选择一个 ColorOS 截图功能。", true);
      return;
    }
    rule = { type: "screenshot", source, screenshotMode: state.editor.pendingScreenshotMode };
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
  state.mappingUi.expanded = true;
  state.mappingUi.addOpen = false;
  closeEditor();
  renderMappings();
  setNotice("规则已更新，保存并应用后生效。");
}

function appendRuleLines(lines, rule) {
    if (rule.type === "app") {
      const mode = rule.freeform ? "freeform" : "normal";
      const repeatMode = rule.closeOnRepeat ? "|toggle" : "";
      lines.push(`launch=${rule.source.join("+")}=>${rule.component}|${mode}${repeatMode}`);
    } else if (rule.type === "shell") {
      if (!rule.shellCommand?.trim() || new TextEncoder().encode(rule.shellCommand).length > 640) return;
      const mode = rule.shellRunAsRoot ? "root" : "shell";
      lines.push(`shell=${rule.source.join("+")}=>${mode}|b64:${base64(rule.shellCommand)}`);
    } else if (rule.type === "screenshot") {
      if (["normal", "long", "area"].includes(rule.screenshotMode)) {
        lines.push(`screenshot=${rule.source.join("+")}=>${rule.screenshotMode}`);
      }
    } else {
      lines.push(`mapping=${rule.source.join("+")}=>${rule.target.join("+")}`);
    }
}

function configText() {
  const lines = ["version=1"];
  if (state.auto) lines.push("device=auto");
  else [...state.selected].forEach((device) => lines.push(`device=${device}`));
  // Which profile the daemon should run. Written explicitly so the file says
  // what it means without having to know the daemon's fallback rules.
  lines.push(`active_profile=${state.activeProfile}`);
  // Every profile is written, not only the active one: a profile that is not
  // in the file is one the daemon cannot switch to -- and the Anland profile
  // exists precisely to be switched to by something other than this page.
  state.profiles.forEach((profile) => {
    lines.push(`profile=${profile.name}`);
    profile.rules.forEach((rule) => appendRuleLines(lines, rule));
  });
  return `${lines.join("\n")}\n`;
}

function base64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeBase64(encoded) {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function shellTestCommand(command, runAsRoot) {
  const encoded = base64(command);
  const runner = runAsRoot ? "/system/bin/sh" : "su shell -c /system/bin/sh";
  const shell = [
    "result_file=/data/local/tmp/gold-keyboardremaps-shell-test.$$.out",
    `printf '%s' '${encoded}' | base64 -d | ${runner} >\"$result_file\" 2>&1`,
    "status=$?",
    "cat \"$result_file\"",
    "rm -f \"$result_file\"",
    "echo __GOLD_SHELL_EXIT__=$status",
    "exit 0",
  ].join("; ");
  return shell;
}

function shellQuote(text) {
  return `'${String(text).replaceAll("'", "'\\\"'\\\"'")}'`;
}

async function testShellCommand() {
  const command = $("#shellCommand").value.trim();
  const output = $("#shellTestOutput");
  const button = $("#testShellCommand");
  if (!command) {
    setNotice("请输入要测试的 Shell 命令。", true);
    return;
  }
  button.disabled = true;
  button.textContent = "测试中";
  output.hidden = false;
  output.classList.remove("error");
  output.textContent = "正在执行...";
  try {
    const { status: bridgeStatus, stdout, stderr } = await execShellTest(shellTestCommand(command, $("#shellRunAsRoot").checked));
    const combined = `${stdout || ""}${stderr || ""}`;
    const match = combined.match(/(?:^|\n)__GOLD_SHELL_EXIT__=(\d+)\s*$/);
    const exitCode = match ? Number(match[1]) : null;
    const content = (match ? combined.slice(0, match.index) : combined).trimEnd();
    if (exitCode === 0) {
      output.textContent = content || "命令执行成功（没有输出）";
    } else {
      const status = exitCode === null ? bridgeStatus : exitCode;
      output.textContent = `${content || "命令没有输出"}${status === 0 ? "" : `\n[exit code: ${status}]`}`;
      output.classList.add("error");
    }
  } catch (error) {
    output.textContent = `执行失败：${error.message}`;
    output.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = "测试命令";
  }
}

function execShellTest(command) {
  const bridge = ksuBridge();
  if (!bridge) {
    return Promise.reject(new Error("未检测到 KernelSU WebUI API，请从 KernelSU Manager 打开本页面。"));
  }
  return new Promise((resolve, reject) => {
    const callback = `gold_keyboardremaps_shell_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window[callback] = (status, stdout, stderr) => {
      delete window[callback];
      resolve({ status: Number(status) || 0, stdout: stdout || "", stderr: stderr || "" });
    };
    try {
      bridge.exec(command, JSON.stringify({}), callback);
    } catch (error) {
      delete window[callback];
      reject(error);
    }
  });
}

async function applyConfig(button, busyText, readyText, successMessage) {
  if (state.mappingUi.draft || state.editor?.draftPart) {
    setNotice("请先完成输入和功能选择，并点击“保存规则”。", true);
    return;
  }
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
  replaceActiveRules(defaultRules());
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
$("#measureLatency").addEventListener("click", measureLatency);
$("#themeToggle").addEventListener("click", cycleTheme);
$("#profileSelect").addEventListener("change", (event) => switchProfile(event.target.value));
$("#saveConfig").addEventListener("click", saveConfig);
$("#restoreDefaults").addEventListener("click", restoreDefaults);
$("#cancelEdit").addEventListener("click", closeEditor);
$("#saveRule").addEventListener("click", saveRule);
$("#saveDraftRule").addEventListener("click", saveDraftRule);
$("#captureSource").addEventListener("click", () => captureKeys("#sourceKeys"));
$("#captureTarget").addEventListener("click", () => captureKeys("#targetKeys"));
$("#appModeToggle").addEventListener("click", toggleAppEditorMode);
$("#colorOsModePanel").addEventListener("click", (event) => {
  const mode = event.target.closest("[data-coloros-screenshot]")?.dataset.colorosScreenshot;
  if (mode) chooseColorOsScreenshot(mode);
});
$("#refreshApps").addEventListener("click", () => refreshApps());
$("#appSearch").addEventListener("input", () => renderApps());
$("#testShellCommand").addEventListener("click", testShellCommand);
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
    openEditor(rule.source.length > 1 ? "combo" : "single", index, rule.type || "keys");
  }
  if (remove !== undefined) {
    state.rules.splice(Number(remove), 1);
    renderMappings();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#keyboardDialog").hidden) closeKeyboardView();
});

document.querySelectorAll(".panel:not(#mappingPanel)").forEach(setupCollapsiblePanel);
$("#toggleMappings").addEventListener("click", () => {
  state.mappingUi.addOpen = false;
  state.mappingUi.expanded = !state.mappingUi.expanded;
  updateMappingPanel();
});
$("#addMapping").addEventListener("click", openAddMapping);
$("#closeAddMapping").addEventListener("click", closeAddMapping);
$("#mappingAddPanel").addEventListener("click", (event) => {
  const option = event.target.closest("[data-add-role]");
  if (option) chooseMappingPart(option);
});

/*
 * The daemon measures its own read-to-write gap, which is the whole point of
 * the figure: a shell-based measurement would be dominated by the cost of
 * launching the measuring tool. What is left to get wrong is the line itself,
 * so both shapes are handled explicitly -- a reading, and the error codes
 * keyboardctl reports when the snapshot is missing, stale, or not what it
 * claims to be. Showing an aged-out number as a current one would be worse
 * than showing nothing.
 */
function parseLatencyLine(line) {
  const fields = String(line || "").trim().split("\t");
  if (fields.length < 4 || fields[0] !== "GOLDCTL1" || fields[1] !== "latency") {
    return null;
  }
  if (fields[2] === "error") {
    return { error: fields[3].replace(/^code=/, "") };
  }
  // Positional and exact, matching what keyboardctl validates before it will
  // pass a reading on at all.
  if (fields[2] !== "ok" || fields[3] !== "code=ready" || fields.length !== 12) {
    return null;
  }
  const values = {};
  for (let index = 4; index < fields.length; index++) {
    const separator = fields[index].indexOf("=");
    if (separator < 0) {
      return null;
    }
    values[fields[index].slice(0, separator)] = fields[index].slice(separator + 1);
  }
  return { values };
}

function formatMicros(value) {
  const micros = Number(value);
  if (!Number.isFinite(micros)) {
    return "—";
  }
  return micros < 1000 ? `${micros} µs` : `${(micros / 1000).toFixed(2)} ms`;
}

const LATENCY_ERROR_TEXT = {
  "no-snapshot": "Gold 还没有开始测量，先在键盘上按几下再读取",
  "no-heartbeat": "读不到快照的更新时间",
  "no-clock": "读不到系统时间",
  "stale": "读数已经过期，Gold 可能没有在运行",
  "malformed": "快照内容无法解析",
};

async function measureLatency() {
  const button = $("#measureLatency");
  const readout = $("#latencyReadout");
  const note = $("#latencyNote");
  if (!button || !readout || !note) {
    return;
  }
  button.disabled = true;
  readout.textContent = "读取中…";
  note.textContent = "";

  let line = "";
  try {
    const result = await exec(`${CONTROL} latency`);
    line = result.stdout;
  } catch (error) {
    // keyboardctl exits non-zero for every error code, and exec turns that into
    // a rejection carrying the very line this needs to read.
    line = String((error && error.message) || "");
  }
  button.disabled = false;

  const parsed = parseLatencyLine(line);
  if (!parsed) {
    readout.textContent = "读数无法解析";
    return;
  }
  if (parsed.error) {
    readout.textContent = LATENCY_ERROR_TEXT[parsed.error] || `读取失败（${parsed.error}）`;
    return;
  }

  const values = parsed.values;
  if (Number(values.count) === 0) {
    readout.textContent = "还没有采样，按几下外接键盘再读取";
    return;
  }
  // Every value goes through formatMicros, which yields a fixed shape or a
  // dash, so nothing here can smuggle markup into the page.
  readout.innerHTML =
    `<span class="latency-figure"><strong>${formatMicros(values.avg_us)}</strong><small>平均</small></span>` +
    `<span class="latency-figure"><strong>${formatMicros(values.last_us)}</strong><small>最近一次</small></span>` +
    `<span class="latency-figure"><strong>${formatMicros(values.min_us)}</strong><small>最低</small></span>` +
    `<span class="latency-figure"><strong>${formatMicros(values.max_us)}</strong><small>最高</small></span>`;
  note.textContent = `最近 ${values.window} 次按键 · 累计 ${values.count} 次`;
}

initialize();
applyTheme(storedTheme());
const colorScheme = window.matchMedia?.("(prefers-color-scheme: dark)");
colorScheme?.addEventListener?.("change", () => {
  if (storedTheme() === "auto") applyTheme("auto");
});
updateMappingPanel();
