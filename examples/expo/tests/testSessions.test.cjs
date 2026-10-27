const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');
const source = readFileSync(resolve(__dirname, '../utils/testSessions.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const loaded = { exports: {} };
new Function('require', 'module', 'exports', outputText)((name) => {
  assert.equal(name, '@/contexts/TestUsersContext');
  return { buildIdentifyTraits: (user) => ({ $set: { email: user.email, display_name: user.displayName } }) };
}, loaded, loaded.exports);
const { generateTestUser, startAnonymousSession, identifyTestUser } = loaded.exports;

test('random users have unique names and sample email addresses', () => {
  const users = Array.from({ length: 100 }, () => generateTestUser());
  assert.equal(new Set(users.map((user) => user.username)).size, 100);
  for (const user of users) {
    assert.match(user.username, /^tester_[a-z0-9_]+$/);
    assert.equal(user.email, `${user.username}@example.com`);
    assert.match(user.displayName, /^Test User /);
  }
});

test('anonymous entry clears previous identity, starts a session, and never identifies', async () => {
  const calls = [];
  const sdk = {
    resetUser: async () => { calls.push('reset'); },
    startSession: async () => { calls.push('start'); },
    identifyUser: async () => { throw Error('Anonymous mode must not identify'); },
  };
  await startAnonymousSession(sdk);
  assert.deepEqual(calls, ['reset', 'start']);
});

test('anonymous session waits for identity reset to finish', async () => {
  let finish;
  let started = false;
  const work = startAnonymousSession({
    resetUser: () => new Promise((resolve) => { finish = resolve; }),
    startSession: async () => { started = true; },
  });
  assert.equal(started, false);
  finish();
  await work;
  assert.equal(started, true);
});

test('failed identity reset prevents starting an anonymous session', async () => {
  let started = false;
  await assert.rejects(startAnonymousSession({
    resetUser: async () => { throw Error('storage failed'); },
    startSession: async () => { started = true; },
  }), /storage failed/);
  assert.equal(started, false);
});

test('identified entry clears the previous identity before calling identifyUser with traits', async () => {
  const calls = [];
  const user = { username: 'tester_one', email: 'tester@example.com', displayName: 'Test User' };
  await identifyTestUser({
    resetUser: async () => { calls.push('reset'); },
    identifyUser: async (...args) => { calls.push(args); },
  }, user);
  assert.deepEqual(calls, ['reset', ['tester_one', { $set: { email: user.email, display_name: user.displayName } }]]);
});
