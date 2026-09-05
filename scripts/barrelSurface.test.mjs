/**
 * The gate's own test. It exists because `check-docs.mjs` decides whether the
 * SDK's public surface is honest, and until T105 nothing decided whether *it*
 * was: sixty lines, four branches, two regexes, zero tests.
 *
 * Runs on stdlib `node --test` — `scripts/` sits outside both workspaces, so
 * neither package's rstest reaches it, and one script does not justify a third
 * runner.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { barrelProblems, exportedNames } from './barrelSurface.mjs';

const scan = (src) => barrelProblems(src, 'barrel');
const hooks = (src) => scan(src).filter((p) => p.startsWith('тестовий хук'));

test('a hook in a value export is caught', () => {
  assert.equal(hooks('export { a, resetContourWasmForTests } from "./x.js";').length, 1);
});

test('a hook hidden behind `export type` is caught — the reason this reads text', () => {
  assert.equal(hooks('export type { FooForTests } from "./x.js";').length, 1);
});

test('a hook renamed on the way out is caught by its exported name', () => {
  const found = hooks('export { resetX as resetContourWasmForTests } from "./x.js";');
  assert.equal(found.length, 1);
  assert.match(found[0], /resetContourWasmForTests/);
});

test('naming a removed hook in a comment does not pin the gate red', () => {
  assert.deepEqual(scan('// resetContourWasmForTests lives in bridge.ts\nexport { a } from "./x.js";'), []);
  assert.deepEqual(scan('/**\n * setContourWasmLoaderForTests moved.\n */\nexport { a } from "./x.js";'), []);
});

test('an empty barrel fails instead of passing vacuously', () => {
  assert.equal(scan('').length, 1);
  assert.match(scan('')[0], /жодного експорту/);
});

test('a star re-export fails: it makes the contents unverifiable by text', () => {
  assert.match(scan('export * from "./x.js";\nexport { a } from "./y.js";')[0], /зірковий/);
});

test('an inline `type` modifier is not part of the name', () => {
  const { names } = exportedNames('export { A, type B } from "./x.js";');
  assert.deepEqual([...names].sort(), ['A', 'B']);
});

test('the real barrel is clean', () => {
  const src = readFileSync(new URL('../packages/sdk/src/index.ts', import.meta.url), 'utf8');
  assert.deepEqual(scan(src), []);
});
