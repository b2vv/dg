import { afterEach, expect, it, rs } from '@rstest/core';
import { Container } from 'pixi.js';
import { normalizeNodeView, NodeViewPool, type NodeViewInput, type NodeViewContext } from './nodeViewFactory.js';
import { defaultNodeTheme } from './types.js';

const node: NodeViewInput = {
  kind: 'position', id: 'seat', data: undefined,
  position: { id: 'seat', title: 'Seat', organizationId: 'org', groupIds: [], status: 'vacant', isTemporary: false },
};
const ctx: NodeViewContext = { lod: 'far', theme: defaultNodeTheme };
afterEach(() => { rs.restoreAllMocks(); });

it('normalizes simple views and destroys the old visual before rebuilding', () => {
  const first = new Container();
  const child = first.addChild(new Container());
  const second = new Container();
  const nextChild = second.addChild(new Container());
  const fn = rs.fn().mockReturnValueOnce(first).mockImplementationOnce(() => {
    expect(child.destroyed).toBe(true);
    return second;
  });
  const view = normalizeNodeView(fn).create(node, ctx);
  expect(view.root).toBe(first);
  view.update(node, { ...ctx, lod: 'mid' });
  expect(fn).toHaveBeenLastCalledWith(node, { ...ctx, lod: 'mid' });
  expect(view.root).toBe(second);
  expect(first.destroyed).toBe(true);
  view.destroy();
  expect(second.destroyed).toBe(true);
  expect(nextChild.destroyed).toBe(true);
});

it('retains seen entries, sweeps unseen entries, recreates on reappearance and clears once', () => {
  const entries: { root: Container; update: ReturnType<typeof rs.fn>; destroy: ReturnType<typeof rs.fn> }[] = [];
  const create = rs.fn(() => {
    const entry = { root: new Container(), update: rs.fn(), destroy: rs.fn() };
    entries.push(entry);
    return entry;
  });
  const factory = { create };
  expect(normalizeNodeView(factory)).toBe(factory);
  const pool = new NodeViewPool(factory);
  pool.beginPass();
  const root = pool.obtain('position:seat', node, ctx);
  pool.markSeen('position:seat');
  pool.obtain('position:other', { ...node, id: 'other' }, ctx);
  pool.markSeen('position:other');
  pool.endPass();
  pool.beginPass();
  const updated = { ...node, data: { id: 'person', fullName: 'New occupant' } };
  expect(pool.obtain('position:seat', updated, { ...ctx, lod: 'mid' })).toBe(root);
  pool.markSeen('position:seat');
  pool.endPass();
  expect(create).toHaveBeenCalledTimes(2);
  expect(entries[0]!.update).toHaveBeenCalledWith(updated, { ...ctx, lod: 'mid' });
  expect(entries[0]!.destroy).not.toHaveBeenCalled();
  expect(entries[1]!.destroy).toHaveBeenCalledTimes(1);
  expect(pool.obtain('position:other', node, ctx)).not.toBe(entries[1]!.root);
  expect(create).toHaveBeenCalledTimes(3);
  pool.clearAll();
  pool.clearAll();
  for (const entry of entries) expect(entry.destroy).toHaveBeenCalledTimes(1);
});

it('contains create and simple callback exceptions and warns once per key', () => {
  const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
  const fail = () => { throw new Error('host'); };
  for (const factory of [fail, { create: fail }]) {
    const pool = new NodeViewPool(factory);
    expect(pool.obtain('position:seat', node, ctx)).toBeNull();
    expect(pool.obtain('position:seat', node, ctx)).toBeNull();
    expect(pool.obtain('position:other', node, ctx)).toBeNull();
  }
  expect(warn).toHaveBeenCalledTimes(4);
});

it('contains update failure, disposes the failed entry and allows recovery', () => {
  const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
  const destroy = rs.fn(() => { throw new Error('destroy'); });
  const create = rs.fn(() => ({ root: new Container(), update() { throw new Error('update'); }, destroy }));
  const pool = new NodeViewPool({ create });
  expect(pool.obtain('position:seat', node, ctx)).toBeInstanceOf(Container);
  expect(pool.obtain('position:seat', node, ctx)).toBeNull();
  expect(destroy).toHaveBeenCalledTimes(1);
  expect(warn).toHaveBeenCalledTimes(1);
  expect(pool.obtain('position:seat', node, ctx)).toBeInstanceOf(Container);
  expect(create).toHaveBeenCalledTimes(2);
});

it('continues sweep and teardown after a host destroy throws', () => {
  const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
  const bad = rs.fn(() => { throw new Error('destroy'); });
  const good = rs.fn();
  const pool = new NodeViewPool({ create(input) {
    return { root: new Container(), update() {}, destroy: input.id === 'seat' ? bad : good };
  } });
  for (let pass = 0; pass < 2; pass++) {
    pool.obtain('position:seat', node, ctx);
    pool.obtain('position:other', { ...node, id: 'other' }, ctx);
    if (pass === 0) { pool.beginPass(); pool.endPass(); }
    else pool.clearAll();
  }
  pool.clearAll();
  expect(bad).toHaveBeenCalledTimes(2);
  expect(good).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenCalledTimes(1);
});

it.each([null, {}])('rejects invalid host roots and entries: %j', (invalid) => {
  const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
  // Deliberately model untyped JavaScript host returns at the public boundary.
  const root = invalid as Container;
  const destroy = rs.fn();
  for (const factory of [() => root, { create: () => ({ root, update() {}, destroy }) }]) {
    const pool = new NodeViewPool(factory);
    expect(pool.obtain('position:seat', node, ctx)).toBeNull();
    expect(pool.obtain('position:seat', node, ctx)).toBeNull();
  }
  const pool = new NodeViewPool({ create: () => invalid } as unknown as Parameters<typeof normalizeNodeView>[0]);
  expect(pool.obtain('position:seat', node, ctx)).toBeNull();
  expect(warn).toHaveBeenCalledTimes(3);
  expect(destroy).toHaveBeenCalledTimes(2);
});

it('contains a simple rebuild failure after destroying its old children', () => {
  const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
  const root = new Container();
  const child = root.addChild(new Container());
  const factory = rs.fn().mockReturnValueOnce(root).mockImplementation(() => { throw new Error('rebuild'); });
  const pool = new NodeViewPool(factory);
  expect(pool.obtain('position:seat', node, ctx)).toBe(root);
  expect(pool.obtain('position:seat', node, ctx)).toBeNull();
  expect(child.destroyed).toBe(true);
  expect(warn).toHaveBeenCalledTimes(1);
});
