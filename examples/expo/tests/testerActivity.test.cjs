const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');
const source = readFileSync(resolve(__dirname, '../utils/testerActivity.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const loaded = { exports: {} };
new Function('module', 'exports', outputText)(loaded, loaded.exports);
const { activityReducer, ACTIVITY_LIMIT, executeTrackingCall, executeInlineCall } = loaded.exports;
const entry = (id) => ({ id: String(id), kind: 'call', method: 'trackEvent', name: 'test_event', status: 'running', timestamp: id, environment: 'uat', session: 'Anonymous', detail: 'Calling SDK' });

test('history is newest first and evicts oldest entries at the session limit', () => {
  let state = [];
  for (let id = 0; id < ACTIVITY_LIMIT + 5; id++) state = activityReducer(state, { type: 'add', entry: entry(id) });
  assert.equal(state.length, ACTIVITY_LIMIT);
  assert.equal(state[0].id, String(ACTIVITY_LIMIT + 4));
  assert.equal(state.at(-1).id, '5');
});
test('finishing a call updates only its entry, preserving SDK events received afterward', () => {
  const original = [entry(2), entry(1)];
  const updated = activityReducer(original, { type: 'finish', id: '1', status: 'returned', detail: 'Call returned', durationMs: 12 });
  assert.equal(updated[0], original[0]);
  assert.equal(updated[1].status, 'returned');
  assert.equal(updated[1].durationMs, 12);
  assert.equal(original[1].status, 'running');
});
test('clearing during an in-flight call does not restore the cleared entry when it returns', () => {
  const cleared = activityReducer([entry(1)], { type: 'clear' });
  assert.deepEqual(activityReducer(cleared, { type: 'finish', id: '1', status: 'returned', detail: '', durationMs: 1 }), []);
});
test('call stays pending until SDK method returns and does not claim network success', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const calls = [], results = [];
  const running = executeTrackingCall('trackEvent', 'feature_used', { trackEvent: async (name) => { calls.push(name); await pending; }, trackScreen: async () => assert.fail('wrong method') }, (...args) => results.push(args));
  assert.deepEqual(calls, ['feature_used']);
  assert.equal(results.length, 0);
  release(); await running;
  assert.equal(results[0][0], 'returned');
  assert.match(results[0][1], /delivery is not confirmed/);
});
test('screen calls use trackScreen and record available thrown errors', async () => {
  const results = [];
  await executeTrackingCall('trackScreen', '/dashboard', { trackEvent: async () => assert.fail('wrong method'), trackScreen: async (name) => { assert.equal(name, '/dashboard'); throw new Error('Device info unavailable'); } }, (...args) => results.push(args));
  assert.deepEqual(results, [['error', 'Device info unavailable']]);
});

test('inline show passes the selected form ID and reset mode without claiming it opened', async () => {
  const calls = [], results = [];
  await executeInlineCall('showForm', 'selected-form', 'on-complete', {
    showForm: async (...args) => calls.push(args), dismissForm: async () => assert.fail('wrong method'),
  }, (...args) => results.push(args));
  assert.deepEqual(calls, [['selected-form', { reset: 'on-complete' }]]);
  assert.equal(results[0][0], 'returned');
  assert.match(results[0][1], /confirm the form opened/);
});
test('inline dismiss targets the open form and reports available call failures', async () => {
  const results = [];
  await executeInlineCall('dismissForm', 'open-form', 'never', {
    showForm: async () => assert.fail('wrong method'),
    dismissForm: async (id) => { assert.equal(id, 'open-form'); throw new Error('Dismiss failed'); },
  }, (...args) => results.push(args));
  assert.deepEqual(results, [['error', 'Dismiss failed']]);
});
test('inline activity keeps its mode, form ID, and reset details when the call finishes', () => {
  const start = { ...entry(1), method: 'showForm', source: 'Exact', formId: 'pinned-form', reset: 'never' };
  const updated = activityReducer([start], { type: 'finish', id: '1', status: 'returned', detail: 'Returned', durationMs: 42 });
  assert.equal(updated[0].source, 'Exact');
  assert.equal(updated[0].formId, 'pinned-form');
  assert.equal(updated[0].reset, 'never');
});
