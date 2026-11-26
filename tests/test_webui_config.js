'use strict';
// Host test for the WebUI's config round trip.
//
// The page reads config.conf, lets the user edit it and writes the whole file
// back. Anything the reader understands but the writer does not is silently
// deleted the first time someone presses 保存并应用 — which is exactly what
// would happen to mapping profiles if the two halves disagreed. So the thing
// worth testing is not either half on its own, but that reading a file and
// writing it straight back preserves what matters.
//
// Runs app.js in a vm with a permissive DOM stub; only parseConfig and
// configText are exercised. Run by tests/test_webui_config.sh.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appPath = process.argv[2] || path.join(__dirname, '..', 'webroot', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

/** An object that answers every question with itself, and is callable. */
function blackHole() {
  const target = function () {};
  return new Proxy(target, {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'then') return undefined;
      if (prop === 'length') return 0;
      return blackHole();
    },
    set() { return true; },
    apply() { return blackHole(); },
    has() { return true; },
  });
}

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  TextEncoder,
  TextDecoder,
  btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  document: blackHole(),
  window: blackHole(),
  navigator: blackHole(),
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

try {
  vm.runInContext(source, sandbox, { filename: appPath });
} catch (error) {
  // Startup touches the DOM far beyond what this test stubs. That is fine as
  // long as the two functions under test were defined before it gave up.
  if (!/parseConfig/.test(String(error))) {
    console.error('could not load app.js: ' + error.message);
    process.exit(2);
  }
}

let failures = 0;
function check(ok, what) {
  if (ok) {
    console.log('ok   ' + what);
  } else {
    console.log('FAIL ' + what);
    failures++;
  }
}

function roundTrip(text) {
  sandbox.__input = text;
  vm.runInContext('parseConfig(__input)', sandbox);
  return vm.runInContext('configText()', sandbox);
}

function ruleCount(text, profile) {
  sandbox.__input = text;
  sandbox.__profile = profile;
  return vm.runInContext(
    'parseConfig(__input), (state.profiles.find((p) => p.name === __profile) || { rules: [] }).rules.length',
    sandbox);
}

function activeProfile(text) {
  sandbox.__input = text;
  vm.runInContext('parseConfig(__input)', sandbox);
  return vm.runInContext('state.activeProfile', sandbox);
}

// ---- a config from before profiles existed -------------------------------

const legacy = 'version=1\ndevice=auto\nmapping=KEY_A=>KEY_B\nlaunch=KEY_C=>app/.Main\n';

check(ruleCount(legacy, '方案一') === 2,
  'an old config is read into 方案一, not hidden in an unnamed section');
check(activeProfile(legacy) === '方案一',
  'and 方案一 becomes the active profile');

const migrated = roundTrip(legacy);
check(migrated.includes('mapping=KEY_A=>KEY_B'),
  'the migrated file keeps the mapping');
check(migrated.includes('active_profile=方案一'),
  'the migrated file names its active profile');
check(migrated.includes('profile=方案一'),
  'the migrated file writes sections');
check(migrated.includes('prefix=none'),
  'a config without an Fn transform writes no prefix instead of dead rules');

// The daemon must still resolve the same rules after the migration: writing
// active_profile=方案一 with the rules under profile=方案一 is only correct if
// the two agree.
check(ruleCount(migrated, '方案一') === 2,
  'reading the migrated file back finds the same rules');

const implicitDefault = [
  'active_profile=默认',
  'mapping=KEY_A=>KEY_B',
  'profile=方案一',
  'mapping=KEY_A=>KEY_C',
  'profile=默认',
  'mapping=KEY_D=>KEY_E',
].join('\n');
check(activeProfile(implicitDefault) === '默认', 'the default profile stays selected');
check(ruleCount(roundTrip(implicitDefault), '默认') === 2,
  'the default profile keeps rules before and after its explicit header');

// ---- sections survive a round trip ---------------------------------------

const profiled = [
  'version=1',
  'device=auto',
  'active_profile=方案二',
  'profile=方案一',
  'mapping=KEY_A=>KEY_B',
  'profile=方案二',
  'mapping=KEY_C=>KEY_D',
  'shell=KEY_E=>shell|b64:' + Buffer.from('echo hi').toString('base64'),
  'profile=Anland',
  'mapping=KEY_F=>KEY_G',
  '',
].join('\n');

check(ruleCount(profiled, '方案一') === 1, '方案一 reads its own rule');
check(ruleCount(profiled, '方案二') === 2, '方案二 reads both of its rules');
check(ruleCount(profiled, 'Anland') === 1, 'Anland reads its own rule');
check(activeProfile(profiled) === '方案二', 'the nominated profile is the active one');

const roundTripped = roundTrip(profiled);
check(ruleCount(roundTripped, '方案一') === 1, '方案一 survives a round trip');
check(ruleCount(roundTripped, '方案二') === 2, '方案二 survives a round trip');
check(ruleCount(roundTripped, 'Anland') === 1, 'Anland survives a round trip');
check(activeProfile(roundTripped) === '方案二', 'the active profile survives a round trip');
check(roundTripped.includes('profile=方案三'),
  'the fixed profiles are written even when empty');

// ---- the global prefix setting ------------------------------------------

const prefixed = 'version=1\nprefix=KEY_LEFTALT\ndevice=auto\nmapping=KEY_A=>KEY_B\n';
check(roundTrip(prefixed).includes('prefix=none'),
  'an unsafe legacy prefix is discarded instead of creating broken rules');
check(!roundTrip(prefixed).includes('prefix=KEY_LEFTALT'),
  'a modifier is never written back as a global prefix');
check(roundTrip('version=1\nprefix=none\ndevice=auto\nmapping=KEY_A=>KEY_B\n').includes('prefix=none'),
  'an explicitly disabled global prefix stays disabled');
check(ruleCount('version=1\nprefix=KEY_LEFTALT\nprofile=方案一\nmapping=KEY_A=>KEY_B\n', '方案一') === 1,
  'the prefix line is not read as a mapping rule');
check(roundTrip('version=1\ndevice=auto\nmapping=KEY_F23=>KEY_FN\n').includes('prefix=KEY_FN'),
  'the default Fn prefix is kept when an Fn transform exists');

// ---- the Anland profile --------------------------------------------------

check(ruleCount(legacy, 'Anland') === 2,
  'a config without an Anland profile gets one copied from 方案一');
check(ruleCount(roundTripped, '方案三') === 0,
  'an existing empty profile is not filled in from somewhere else');

// The daemon refuses a request for a profile that is not in the file, so this
// one being present after a save is what makes immersive mode able to switch.
check(roundTrip(legacy).includes('profile=Anland'),
  'saving writes the Anland profile the daemon will be asked for');

// ---- editing the active profile only ------------------------------------

sandbox.__input = profiled;
vm.runInContext('parseConfig(__input)', sandbox);
vm.runInContext('useProfile("方案二"), state.rules.push({ type: "keys", source: ["KEY_H"], target: ["KEY_I"] })', sandbox);
const edited = vm.runInContext('configText()', sandbox);
check(ruleCount(edited, '方案二') === 3, 'a rule added while editing lands in the active profile');
check(ruleCount(edited, '方案一') === 1, 'and does not leak into another profile');

// ---- source normalisation -----------------------------------------------

vm.runInContext(
  'state.profiles = [{ name: "方案一", rules: [{ type: "keys", source: ["KEY_F23"], target: ["KEY_FN"] }] }]',
  sandbox);
check(vm.runInContext('canonicalizeSource(["KEY_TAB", "KEY_LEFTCTRL"], ["KEY_X"]).join("+")', sandbox) ===
  'KEY_LEFTCTRL+KEY_TAB',
  'a modifier is moved in front of the Ctrl+Tab trigger key');
check(vm.runInContext('canonicalizeSource(["KEY_F23", "KEY_1"], ["KEY_A"]).join("+")', sandbox) ===
  'KEY_FN+KEY_1',
  'a transform source is resolved to Fn before ordering');
check(vm.runInContext('canonicalizeSource(["KEY_F23"], ["KEY_FN"]).join("+")', sandbox) ===
  'KEY_F23',
  'the transform rule itself is not rewritten to Fn=>Fn');
vm.runInContext('state.__transformRule = state.profiles[0].rules[0]', sandbox);
check(vm.runInContext(
  'canonicalizeSource(["KEY_F23"], ["KEY_A"], state.profiles[0], state.__transformRule).join("+")',
  sandbox) === 'KEY_F23',
  'editing a transform rule into a normal rule does not canonicalise away its own source');

// ---- global prefix auto-completion --------------------------------------

vm.runInContext('state.prefix = "KEY_FN"', sandbox);
check(vm.runInContext('applyGlobalPrefix(["KEY_1"], true).join("+")', sandbox) === 'KEY_FN+KEY_1',
  'the global prefix is prepended to a new key combo');
check(vm.runInContext('applyGlobalPrefix(["KEY_FN", "KEY_1"], true).join("+")', sandbox) === 'KEY_FN+KEY_1',
  'an existing prefix is not duplicated');
check(vm.runInContext('applyGlobalPrefix(["KEY_1"], false).join("+")', sandbox) === 'KEY_1',
  'single-key and non-key rules are not prefixed');
check(vm.runInContext('applyGlobalPrefix(["KEY_LEFTCTRL", "KEY_Q"], true).join("+")', sandbox) === 'KEY_LEFTCTRL+KEY_Q',
  'a deliberate modifier chord is left alone');
check(vm.runInContext('applyGlobalPrefix(["KEY_FN","KEY_1","KEY_2","KEY_3","KEY_4","KEY_5","KEY_6","KEY_7"], true).length', sandbox) === 8,
  'the prefix is not added when the combo already has eight keys');
vm.runInContext('state.prefix = "KEY_LEFTALT"', sandbox);
check(vm.runInContext('applyGlobalPrefix(["KEY_1"], true).join("+")', sandbox) === 'KEY_1',
  'a modifier can never be used as a global prefix');
vm.runInContext('state.profiles = [{ name: "方案一", rules: [{ type: "keys", source: ["KEY_A"], target: ["KEY_B"] }] }]', sandbox);
vm.runInContext('state.prefix = "KEY_FN"', sandbox);
check(vm.runInContext('applyGlobalPrefix(["KEY_1"], true).join("+")', sandbox) === 'KEY_1',
  'Fn is not added when the config has no Fn transform');
vm.runInContext('state.prefix = ""', sandbox);
check(vm.runInContext('applyGlobalPrefix(["KEY_1"], true).join("+")', sandbox) === 'KEY_1',
  'an empty global prefix adds nothing');

// ---- hierarchical device grouping & hotplug snapshot parsing ------------

const sampleDevicesOutput = [
  '/dev/input/event15\t0005\t330a\t0001\tOnePlus Pencil\tKEYBOARD | EXTERNAL',
  '/dev/input/event12\t0005\t22d9\t3869\tOnePlus Pad 2 Pro Keyboard Consumer Control\tKEYBOARD | EXTERNAL',
  '/dev/input/event13\t0005\t22d9\t3869\tOnePlus Pad 2 Pro Keyboard Touchpad\tTOUCH | TOUCH_MT | TOUCHPAD | EXTERNAL',
  '/dev/input/event11\t0005\t22d9\t3869\tOnePlus Pad 2 Pro Keyboard\tKEYBOARD | ALPHAKEY | EXTERNAL',
  '/dev/input/event10\t0019\t22d9\t3869\tpogo_touchpad\tTOUCH | TOUCH_MT | TOUCHPAD | EXTERNAL',
  '/dev/input/event9\t0019\t22d9\t3869\tOnePlus Pad 2 Pro Keyboard\tKEYBOARD | ALPHAKEY | EXTERNAL',
  '/dev/input/event8\t0005\t046d\tb023\tLogitech MX Master Mouse\tCURSOR | EXTERNAL',
  '/dev/input/event7\t0005\t004c\t200e\tAirPods Consumer Control\tKEYBOARD | EXTERNAL',
  '/dev/input/event6\t0000\t0000\t0000\ttouchpanel_pen\tKEYBOARD | ALPHAKEY | DPAD | VIRTUAL',
  '/dev/input/event4\t0000\t0000\t0000\ttouchpanel\tKEYBOARD | TOUCH | TOUCH_MT',
].join('\n');

sandbox.__devicesOutput = sampleDevicesOutput;
vm.runInContext('parseDevices(__devicesOutput)', sandbox);
const groupsJson = vm.runInContext('JSON.stringify(groupDevices(state.devices))', sandbox);
const groups = JSON.parse(groupsJson);

const pogoGroup = groups.find((g) => g.key === '0019|22d9|3869');
check(pogoGroup && pogoGroup.name === 'OnePlus Pad 2 Pro Keyboard',
  'pogo keyboard group uses keyboard name instead of earlier touchpad sibling');
check(pogoGroup && pogoGroup.busName === '物理触点' && pogoGroup.devices.length === 2,
  'pogo keyboard group keeps both physical endpoints under 物理触点');

const btGroup = groups.find((g) => g.key === '0005|22d9|3869');
check(btGroup && btGroup.name === 'OnePlus Pad 2 Pro Keyboard' && btGroup.busName === '蓝牙' && btGroup.devices.length === 3,
  'bluetooth keyboard group combines keyboard, consumer control and touchpad');

const zeroIdGroups = groups.filter((g) => g.devices.some((d) => d.vendor === '0000' && d.product === '0000'));
check(zeroIdGroups.length === 2,
  'zero vendor/product devices are not merged into a single hardware group');

check(groups[0].hasSupported && !groups[groups.length - 1].hasSupported,
  'supported device groups are sorted before unsupported-only groups');

check(vm.runInContext('isUnsupportedDevice(state.devices.find((d) => d.path === "/dev/input/event8"))', sandbox) === true,
  'mouse devices are marked unsupported for keyboard remapping');
check(vm.runInContext('isAutoKeyboard(state.devices.find((d) => d.path === "/dev/input/event12"))', sandbox) === true,
  'consumer control endpoint sharing bus/vendor/product with a keyboard is auto-selected');
check(vm.runInContext('isAutoKeyboard(state.devices.find((d) => d.path === "/dev/input/event7"))', sandbox) === false,
  'standalone consumer control without a sibling keyboard is not auto-selected');

const snap1 = vm.runInContext(
  'parseInputStatusSnapshot("GOLDCTL1\\tinput-status\\tok\\tcode=ready\\tboot_id=b\\tgeneration=10\\tinstance=0123456789abcdef0123456789abcdef\\tcount=1\\tnodes=event9\\tclaimed=event11,event9")',
  sandbox);
const snap2 = vm.runInContext(
  'parseInputStatusSnapshot("GOLDCTL1\\tinput-status\\tok\\tcode=ready\\tboot_id=b\\tgeneration=11\\tinstance=0123456789abcdef0123456789abcdef\\tcount=1\\tnodes=event9\\tclaimed=event11,event9")',
  sandbox);
const snap3 = vm.runInContext(
  'parseInputStatusSnapshot("GOLDCTL1\\tinput-status\\tok\\tcode=ready\\tboot_id=b\\tgeneration=12\\tinstance=0123456789abcdef0123456789abcdef\\tcount=2\\tnodes=event11,event12\\tclaimed=event11,event12")',
  sandbox);
check(snap1 && snap2 && snap1.signature === snap2.signature,
  'heartbeat generation increments do not falsely trigger hotplug refreshes');
check(snap1 && snap3 && snap1.signature !== snap3.signature,
  'changes to nodes or claimed produce a different hotplug signature');

console.log('\n' + (failures === 0 ? 'all checks passed' : 'there were failures'));
process.exit(failures === 0 ? 0 : 1);
