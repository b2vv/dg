import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { publicSurface } from './facadeSurface.mjs';

const ROOT = resolve(import.meta.dirname, '..');

const facade = (body) => `export class OrgHierarchyDiagram {\n${body}\n}\n`;

test('success: plain, async and generic methods are collected', () => {
  const surface = publicSurface(
    facade('  render(): void {}\n  async search(): Promise<void> {}\n  setData<TRaw>(): void {}'),
  );
  assert.deepEqual([...surface], ['render', 'search', 'setData']);
});

test('failure: private and protected members are excluded', () => {
  const surface = publicSurface(
    facade('  visible(): void {}\n  private hidden(): void {}\n  protected inherited(): void {}'),
  );
  assert.deepEqual([...surface], ['visible']);
});

test('failure: the constructor is excluded', () => {
  assert.deepEqual([...publicSurface(facade('  constructor() {}'))], []);
});

test('success: get and set accessors are collected by property name', () => {
  const surface = publicSurface(
    facade('  get media(): unknown {}\n  set media(value: unknown) {}'),
  );
  assert.deepEqual([...surface], ['media']);
  assert.ok(!surface.has('get'));
  assert.ok(!surface.has('set'));
});

test('failure: module-level control flow outside the class contributes nothing', () => {
  const source = `function visit() {
  if (ready) {}
  for (const item of items) {}
}

${facade('  render(): void {}')}`;
  assert.deepEqual([...publicSurface(source)], ['render']);
});

test('failure: two-space-indented lines after the class closing brace contribute nothing', () => {
  const source = `${facade('  render(): void {}')}  afterClass(): void {}\n`;
  assert.deepEqual([...publicSurface(source)], ['render']);
});

test('the real OrgHierarchyDiagram surface excludes keyword phantoms and includes media', () => {
  // A suite that only ever saw fixtures would stay green through the exact
  // drift this module exists to catch.
  const source = readFileSync(
    join(ROOT, 'packages/sdk/src/OrgHierarchyDiagram.ts'),
    'utf8',
  );
  const surface = publicSurface(source);
  assert.ok(!surface.has('if'));
  assert.ok(!surface.has('for'));
  assert.ok(surface.has('media'));
});

test('success: a class header with an implements clause is scanned', () => {
  const source = `export class OrgHierarchyDiagram implements Foo {
  render(): void {}
}
`;
  assert.deepEqual([...publicSurface(source)], ['render']);
});

test('success: a class header with its brace on the next line is scanned', () => {
  const source = `export class OrgHierarchyDiagram
{
  render(): void {}
}
`;
  assert.deepEqual([...publicSurface(source)], ['render']);
});

test('failure: a missing OrgHierarchyDiagram class throws', () => {
  assert.throws(
    () => publicSurface('export class AnotherDiagram {}\n'),
    /OrgHierarchyDiagram/,
  );
});

test('success: a class with no public members returns an empty set', () => {
  assert.deepEqual([...publicSurface(facade(''))], []);
});
