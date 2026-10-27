const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');
function load(name) {
  const source = readFileSync(resolve(__dirname, '../utils/' + name + '.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((path) => { assert.equal(path, './testerActivity'); return load('testerActivity'); }, loaded, loaded.exports);
  return loaded.exports;
}
const { sdkLogReducer, formatSdkPayload, getSdkFormId } = load('sdkLogs');
const { ACTIVITY_LIMIT } = load('testerActivity');
const entry = (id, kind = 'sdk') => ({ id: String(id), kind, name: 'form:show', status: 'received', timestamp: id, environment: 'uat', session: 'Anonymous', detail: '' });

test('SDK log list excludes manual calls and completion updates for missing calls', () => {
  const logs = [entry(1)];
  assert.equal(sdkLogReducer(logs, { type: 'add', entry: entry(2, 'call') }), logs);
  assert.deepEqual(sdkLogReducer(logs, { type: 'finish', id: 'missing', status: 'returned', detail: 'Returned', durationMs: 1 }), logs);
});
test('SDK log retention is independent of manual activity and capped at 100', () => {
  let logs = [];
  for (let i = 0; i < ACTIVITY_LIMIT + 5; i++) logs = sdkLogReducer(logs, { type: 'add', entry: entry(i) });
  for (let i = 0; i < 200; i++) logs = sdkLogReducer(logs, { type: 'add', entry: entry(1000 + i, 'call') });
  assert.equal(logs.length, ACTIVITY_LIMIT);
  assert.equal(logs[0].id, '104');
  assert.equal(logs.at(-1).id, '5');
  assert.deepEqual(sdkLogReducer(logs, { type: 'clear' }), []);
});
test('inspector preserves SDK event payload details without modifying the original', () => {
  const payload = { formId: 'selected-form', timestamp: 123, data: { action: 'dismiss', error: 'Form failed' } };
  assert.deepEqual(JSON.parse(formatSdkPayload(payload)), payload);
});
test('inspector redacts credentials and handles circular values and Errors', () => {
  const payload = { apiKey: 'secret-key', data: { authorization: 'secret-header', error: new Error('Connection failed') } };
  payload.self = payload;
  const result = JSON.parse(formatSdkPayload(payload));
  assert.equal(result.apiKey, '[redacted]');
  assert.equal(result.data.authorization, '[redacted]');
  assert.equal(result.self, '[circular]');
  assert.equal(result.data.error.message, 'Connection failed');
  assert.equal(payload.apiKey, 'secret-key');
});
test('large payload display is bounded', () => {
  const result = formatSdkPayload({ data: 'x'.repeat(20000) });
  assert.ok(result.length < 16100);
  assert.match(result, /truncated$/);
});

test('SDK log rows use feedbackConfigurationId when the SDK emits an empty formId', () => {
  assert.equal(getSdkFormId({ formId: '', data: { feedbackConfigurationId: 'actual-form' } }), 'actual-form');
  assert.equal(getSdkFormId({ formId: 'explicit-form', data: { feedbackConfigurationId: 'other' } }), 'explicit-form');
  assert.equal(getSdkFormId({ data: { feedbackConfigurationId: 12 } }), undefined);
});

test('network response status and payload update the matching SDK request', () => {
  const logs = sdkLogReducer([entry(1)], { type: 'finish', id: '1', status: 'returned', detail: '', durationMs: 45, httpStatus: 201, payload: '{"response":{"status":201}}' });
  assert.equal(logs[0].httpStatus, 201);
  assert.equal(logs[0].durationMs, 45);
  assert.match(logs[0].payload, /201/);
});

test('request and response bodies remain independently available after a response arrives', () => {
  const request = formatSdkPayload({ answer: 'x'.repeat(20000) });
  const logs = sdkLogReducer([{ ...entry(1), requestUrl: 'https://api.encatch.com/test', requestPayload: request }], {
    type: 'finish', id: '1', status: 'returned', detail: '', durationMs: 45, httpStatus: 200,
    responsePayload: formatSdkPayload({ accepted: true }),
  });
  assert.match(logs[0].requestPayload, /truncated$/);
  assert.deepEqual(JSON.parse(logs[0].responsePayload), { accepted: true });
  assert.equal(logs[0].requestUrl, 'https://api.encatch.com/test');
});
