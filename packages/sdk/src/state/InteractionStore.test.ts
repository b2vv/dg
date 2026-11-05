import { describe, expect, it, rstest } from '@rstest/core';
import type { NodeRef } from '../core/index.js';
import { InteractionStore } from './InteractionStore.js';

const org = (id: string): NodeRef => ({ kind: 'organization', id, organizationId: id });

describe('InteractionStore', () => {
  it('success: selection changes notify both channels with the new snapshot', () => {
    const onSelectionChange = rstest.fn();
    const store = new InteractionStore({ onSelectionChange });
    const listener = rstest.fn();
    store.subscribe(listener);
    expect(store.state).toEqual({ selected: [], primary: null, hovered: null });
    expect(store.replace(org('a'))).toBe(true);
    expect(store.state).toEqual({ selected: [org('a')], primary: org('a'), hovered: null });
    expect(store.list).toEqual([org('a')]);
    expect(store.primary).toEqual(org('a'));
    expect(listener).toHaveBeenCalledExactlyOnceWith(store.state);
    expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith([org('a')]);
  });

  it.each([
    { ctrlKey: true, metaKey: false, shiftKey: false },
    { ctrlKey: false, metaKey: true, shiftKey: false },
    { ctrlKey: false, metaKey: false, shiftKey: true },
  ])('success: pointer modifiers toggle membership: %j', (mods) => {
    const store = new InteractionStore();
    store.replace(org('a'));
    expect(store.handlePointerSelect(org('b'), mods)).toBe(true);
    expect(store.list).toEqual([org('a'), org('b')]);
    expect(store.toggle(org('a'))).toBe(true);
    expect(store.primary).toEqual(org('b'));
    store.handlePointerSelect(org('a'), { ctrlKey: false, metaKey: false, shiftKey: false });
    expect(store.list).toEqual([org('a')]);
    store.handlePointerSelect(org('b'));
    expect(store.list).toEqual([org('b')]);
  });

  it('success: clear notifies once and preserves hover', () => {
    const store = new InteractionStore();
    store.replace(org('a'));
    store.setHovered(org('b'));
    const listener = rstest.fn();
    store.subscribe(listener);
    expect(store.clear()).toBe(true);
    expect(store.state).toEqual({ selected: [], primary: null, hovered: org('b') });
    expect(listener).toHaveBeenCalledExactlyOnceWith(store.state);
  });

  it('success: replaceMany deduplicates while preserving selection order', () => {
    const store = new InteractionStore();
    const listener = rstest.fn();
    store.subscribe(listener);
    expect(store.replaceMany([org('b'), org('a'), org('b')])).toBe(true);
    expect(store.list).toEqual([org('b'), org('a')]);
    expect(store.primary).toEqual(org('b'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.replaceMany([org('a'), org('b')])).toBe(true);
    expect(store.primary).toEqual(org('a'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('success: arbitrary hover refs and null notify only interaction listeners', () => {
    const onSelectionChange = rstest.fn();
    const store = new InteractionStore({ onSelectionChange });
    const listener = rstest.fn();
    store.subscribe(listener);
    expect(store.setHovered(org('unknown'))).toBe(true);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ selected: [], primary: null, hovered: org('unknown') });
    listener.mockClear();
    expect(store.setHovered(null)).toBe(true);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ selected: [], primary: null, hovered: null });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('failure: unchanged selection and hover emit nothing, including empty state', () => {
    const onSelectionChange = rstest.fn();
    const store = new InteractionStore({ onSelectionChange });
    const listener = rstest.fn();
    store.subscribe(listener);
    expect(store.clear()).toBe(false);
    expect(store.replaceMany([])).toBe(false);
    expect(store.setHovered(null)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    store.replace(org('a'));
    store.setHovered(org('a'));
    listener.mockClear();
    onSelectionChange.mockClear();
    expect(store.replace(org('a'))).toBe(false);
    expect(store.replaceMany([org('a'), org('a')])).toBe(false);
    expect(store.handlePointerSelect(org('a'))).toBe(false);
    expect(store.setHovered(org('a'))).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('failure: reconcile clears a stale hover once without changing selection', () => {
    const store = new InteractionStore();
    store.replace(org('a'));
    store.setHovered(org('b'));
    const listener = rstest.fn();
    store.subscribe(listener);
    const present = new Set(['a', 'b']);
    const isPresent = rstest.fn((ref: NodeRef) => present.has(ref.id));
    store.reconcile(isPresent);
    expect(listener).not.toHaveBeenCalled();
    present.delete('b');
    store.reconcile(isPresent);
    expect(store.state).toEqual({ selected: [org('a')], primary: org('a'), hovered: null });
    expect(listener).toHaveBeenCalledExactlyOnceWith(store.state);
    isPresent.mockClear();
    store.reconcile(isPresent);
    expect(isPresent).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('failure: throwing listeners are isolated and each warns only once', () => {
    const warn = rstest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const store = new InteractionStore();
      const first = rstest.fn(() => { throw new Error('first'); });
      const second = rstest.fn(() => { throw new Error('second'); });
      const remaining = rstest.fn();
      store.subscribe(first);
      store.subscribe(second);
      store.subscribe(remaining);
      expect(() => store.replace(org('a'))).not.toThrow();
      expect(() => store.setHovered(org('b'))).not.toThrow();
      expect(first).toHaveBeenCalledTimes(2);
      expect(second).toHaveBeenCalledTimes(2);
      expect(remaining).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  it('failure: unsubscribe during emit keeps the current listener snapshot', () => {
    const store = new InteractionStore();
    const remaining = rstest.fn();
    const late = rstest.fn();
    store.subscribe(() => { dispose(); store.subscribe(late); });
    const dispose = store.subscribe(remaining);
    store.replace(org('a'));
    expect(remaining).toHaveBeenCalledTimes(1);
    expect(late).not.toHaveBeenCalled();
    store.setHovered(org('b'));
    expect(remaining).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('failure: duplicate subscriptions are distinct and disposal is idempotent', () => {
    const store = new InteractionStore();
    const listener = rstest.fn();
    const disposeFirst = store.subscribe(listener);
    const disposeSecond = store.subscribe(listener);
    store.replace(org('a'));
    expect(listener).toHaveBeenCalledTimes(2);
    disposeFirst();
    disposeFirst();
    store.setHovered(org('b'));
    expect(listener).toHaveBeenCalledTimes(3);
    disposeSecond();
    store.clear();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
