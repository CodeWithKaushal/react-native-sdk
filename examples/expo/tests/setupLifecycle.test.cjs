const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

function loadTs(file, dependencies) {
  const source = readFileSync(resolve(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

function harness(clearFailure = false) {
  const values = new Map([['encatch_tester_saved_users', '[{"username":"keep_me"}]']]);
  const removed = [];
  const events = [];
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState: (initial) => [initial, () => {}],
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
    createElement: (_, props) => props.value,
  };
  react.default = react;
  const storage = {
    removeItem: async (key) => { removed.push(key); values.delete(key); },
    setItem: async (key, value) => { values.set(key, value); },
  };
  const config = loadTs('contexts/TesterConfigContext.tsx', {
    react,
    '@react-native-async-storage/async-storage': { default: storage },
    '@/constants/Config': { EncatchConfig: { formIds: [] } },
    '@/constants/environments': { resolveEnvironment: (value) => value || 'uat' },
    '@/constants/formIds': { parseFormIds: (value) => value.split(',') },
  });
  const session = loadTs('contexts/TesterSessionContext.tsx', {
    react,
    '@/contexts/TesterConfigContext': config,
    '@encatch/react-native-sdk': { Encatch: { isInitialized: true, clearAll: async () => {
      events.push('clear SDK');
      if (clearFailure) throw Error('clear failed');
    } } },
  });
  const initial = { apiKey: 'old-key', formId: 'form-one', interceptorFormId: '', environment: 'uat' };
  const api = session.TesterSessionProvider({ initialSetup: initial, onSetupChange: (value) => events.push(value), children: null });
  return { api, initial, values, removed, events };
}

test('clear setup removes only setup keys, resets SDK state, and preserves saved user profiles', async () => {
  const { api, values, removed, events } = harness();
  await api.changeSetup();
  assert.deepEqual(removed.sort(), ['encatch_tester_api_key', 'encatch_tester_environment', 'encatch_tester_form_id', 'encatch_tester_interceptor_form_id']);
  assert.equal(values.get('encatch_tester_saved_users'), '[{"username":"keep_me"}]');
  assert.deepEqual(events, ['clear SDK', { apiKey: '', formId: '', interceptorFormId: '', environment: 'uat' }]);
});

test('changing API key, environment, or interceptor resets the native singleton before applying setup', async () => {
  for (const patch of [{ apiKey: 'new-key' }, { environment: 'dev' }, { interceptorFormId: 'intercept-me' }]) {
    const { api, initial, events } = harness();
    const next = { ...initial, ...patch };
    await api.updateSetup(next);
    assert.deepEqual(events, ['clear SDK', next]);
  }
});

test('changing just the form ID preserves native identity and device state', async () => {
  const { api, initial, events } = harness();
  const next = { ...initial, formId: 'form-two' };
  await api.updateSetup(next);
  assert.deepEqual(events, [next]);
});

test('a failed SDK reset does not report a completed setup reset', async () => {
  const { api, events } = harness(true);
  await assert.rejects(api.changeSetup(), /clear failed/);
  assert.deepEqual(events, ['clear SDK']);
});
