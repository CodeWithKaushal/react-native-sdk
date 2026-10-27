const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');
const source = readFileSync(resolve(__dirname, '../utils/sdkNetwork.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const loaded = { exports: {} };
new Function('module', 'exports', outputText)(loaded, loaded.exports);
const { describeSdkRequest, observeSdkNetwork, parseNetworkBody } = loaded.exports;
const url = (endpoint) => 'https://api.uat.encatch.com/engage-product/encatch/api/v2/encatch/' + endpoint;
const body = JSON.stringify({ eventName: 'feature_used' });
function recorder() {
  const logs = [];
  return { logs, observe: (request) => { const log = { request, results: [] }; logs.push(log); return (result) => log.results.push(result); } };
}
class FakeXHR extends EventTarget {
  status = 0; responseText = ''; responseType = ''; upload = new EventTarget();
  open(...args) { this.openArgs = args; }
  send(body) { this.sentBody = body; this.onload?.(); }
  complete(status, text) { this.status = status; this.responseText = text; this.dispatchEvent(new Event('loadend')); }
}

test('maps operational requests to readable names and preserves target names', () => {
  assert.equal(describeSdkRequest(url('show-form'), 'POST', '{"formSlugOrId":"test-form"}').name, 'Show form');
  assert.equal(describeSdkRequest(url('submit-form'), 'POST', '{}').name, 'Submit form');
  assert.equal(describeSdkRequest(url('upload'), 'POST', '{}').name, 'Upload file');
  assert.equal(describeSdkRequest(url('track-event'), 'POST', body).target, 'feature_used');
  assert.equal(describeSdkRequest(url('track-screen'), 'POST', '{"$deviceInfo":{"$urlOrScreenName":"/home"}}').target, '/home');
});
test('excludes lifecycle telemetry and unrelated traffic', () => {
  for (const eventName of ['form:show', 'form:submit', 'form:section:change']) assert.equal(describeSdkRequest(url('track-event'), 'POST', JSON.stringify({ eventName })), null);
  assert.equal(describeSdkRequest('https://api.uat.encatch.com.attacker.test/engage-product/encatch/api/v2/encatch/show-form', 'POST', '{}'), null);
  assert.equal(describeSdkRequest('https://other.example/' , 'POST', '{}'), null);
  assert.equal(describeSdkRequest('https://api.encatch.com/other/show-form', 'POST', '{}'), null);
});
test('fetch observation preserves arguments, response identity, and readable body', async () => {
  const { logs, observe } = recorder();
  const response = new Response('{"accepted":true}', { status: 200 });
  const init = { method: 'POST', body };
  const runtime = { fetch: async (input, options) => { assert.equal(input, url('track-event')); assert.equal(options, init); return response; } };
  const original = runtime.fetch; const cleanup = observeSdkNetwork(observe, runtime);
  const result = await runtime.fetch(url('track-event'), init);
  assert.equal(result, response);
  assert.deepEqual(await result.json(), { accepted: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].results[0].httpStatus, 200);
  assert.deepEqual(logs[0].results.at(-1).body, { accepted: true });
  cleanup(); assert.equal(runtime.fetch, original);
});
test('fetch rejection is logged and propagated unchanged', async () => {
  const { logs, observe } = recorder(); const failure = new Error('Offline');
  const runtime = { fetch: async () => { throw failure; } }; const cleanup = observeSdkNetwork(observe, runtime);
  await assert.rejects(runtime.fetch(url('show-form'), { method: 'POST', body: '{}' }), (error) => error === failure);
  assert.equal(logs[0].results[0].error, 'Offline'); cleanup();
});
test('XHR uploads preserve app handlers, body, progress and HTTP errors', () => {
  const { logs, observe } = recorder();
  const runtime = { XMLHttpRequest: FakeXHR, fetch: async () => new Response() };
  const cleanup = observeSdkNetwork(observe, runtime);
  const xhr = new FakeXHR(); let load = 0, progress = 0;
  xhr.onload = () => load++; xhr.upload.addEventListener('progress', () => progress++);
  const form = { getParts: () => [{ fieldName: 'formId', string: 'form-one' }, { fieldName: 'file', uri: 'private-file', name: 'test.png', type: 'image/png' }] };
  xhr.open('POST', url('upload'), true); xhr.send(form);
  assert.equal(xhr.sentBody, form); assert.equal(load, 1); assert.equal(logs[0].request.name, 'Upload file');
  assert.equal(logs[0].request.formId, 'form-one'); assert.ok(!JSON.stringify(logs).includes('private-file'));
  xhr.upload.dispatchEvent(new Event('progress')); assert.equal(progress, 1);
  xhr.complete(422, '{"error":"Unsupported file"}');
  assert.equal(logs[0].results.length, 1); assert.equal(logs[0].results[0].httpStatus, 422);
  assert.deepEqual(logs[0].results[0].body, { error: 'Unsupported file' }); cleanup();
});
test('fetch polyfill XHR produces one request log', async () => {
  const { logs, observe } = recorder();
  const runtime = { XMLHttpRequest: FakeXHR, fetch: (input, init) => {
    const xhr = new FakeXHR(); xhr.open(init.method, input); xhr.send(init.body); xhr.complete(200, '{}');
    return Promise.resolve(new Response('{}'));
  } };
  const cleanup = observeSdkNetwork(observe, runtime);
  await runtime.fetch(url('track-event'), { method: 'POST', body });
  await new Promise((resolve) => setImmediate(resolve)); assert.equal(logs.length, 1); cleanup();
});
test('logging failures do not break networking and cleanup restores XHR methods', async () => {
  const originalOpen = FakeXHR.prototype.open, originalSend = FakeXHR.prototype.send;
  const runtime = { XMLHttpRequest: FakeXHR, fetch: async () => new Response('{}') };
  const cleanup = observeSdkNetwork(() => { throw new Error('Log error'); }, runtime);
  const result = await runtime.fetch(url('show-form'), { method: 'POST', body: '{}' });
  assert.equal(result.status, 200); cleanup();
  assert.equal(FakeXHR.prototype.open, originalOpen); assert.equal(FakeXHR.prototype.send, originalSend);
});
test('cleanup prevents pending responses repopulating logs', async () => {
  const { logs, observe } = recorder(); let resolve;
  const runtime = { fetch: () => new Promise((done) => { resolve = done; }) };
  const cleanup = observeSdkNetwork(observe, runtime);
  const pending = runtime.fetch(url('show-form'), { method: 'POST', body: '{}' }); cleanup();
  resolve(new Response('{}')); await pending;
  assert.equal(logs[0].results.length, 0);
});
