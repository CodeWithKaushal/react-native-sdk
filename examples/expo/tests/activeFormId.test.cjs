const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');
const source = readFileSync(resolve(__dirname, '../hooks/useActiveFormId.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });

function tester(initial, defaults = []) {
  let formId = initial;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => {
    if (name === 'react') return { useMemo: (factory) => factory() };
    assert.equal(name, '@/contexts/TesterConfigContext');
    return {
      useTesterConfig: () => ({ formId, setFormId: (next) => { formId = next.trim(); } }),
      mergeEnvFormIds: (value) => [...new Set([value, ...defaults].filter(Boolean))],
    };
  }, module, module.exports);
  return module.exports.useActiveFormId;
}

test('clearing an existing ID disables the active form instead of falling back to defaults', () => {
  const read = tester('saved-form', ['default-one', 'default-two']);
  read().setManualFormId('');
  const cleared = read();
  assert.equal(cleared.activeFormId, '');
  assert.equal(cleared.selectedFormId, '');
  assert.equal(cleared.manualFormId, '');
  assert.deepEqual(cleared.suggestedIds, ['default-one', 'default-two']);
});

test('a manually entered ID is honored even when environment suggestions exist', () => {
  const read = tester('saved-form', ['default-one', 'default-two']);
  read().setManualFormId('  custom-form  ');
  assert.equal(read().activeFormId, 'custom-form');
  assert.equal(read().selectedFormId, 'custom-form');
});

test('Home and Inline consumers see the same ID after either input changes it', () => {
  const read = tester('first');
  const home = read();
  const inline = read();
  home.setManualFormId('from-home');
  assert.equal(read().activeFormId, 'from-home');
  inline.setSelectedFormId('from-inline');
  assert.equal(read().manualFormId, 'from-inline');
  assert.equal(read().activeFormId, 'from-inline');
});
