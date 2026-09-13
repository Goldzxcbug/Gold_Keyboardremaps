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

// The daemon must still resolve the same rules after the migration: writing
// active_profile=方案一 with the rules under profile=方案一 is only correct if
// the two agree.
check(ruleCount(migrated, '方案一') === 2,
  'reading the migrated file back finds the same rules');

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

console.log('\n' + (failures === 0 ? 'all checks passed' : 'there were failures'));
process.exit(failures === 0 ? 0 : 1);
