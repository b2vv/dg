import { describe, expect, it, vi } from 'vitest';
import { SelectionStore } from './SelectionStore.js';
import type { NodeRef } from '../interaction/types.js';

const org = (id: string): NodeRef => ({ kind: 'organization', id, organizationId: id });

describe('SelectionStore (T76)', () => {
  it('success: replace and toggle notify onChange', () => {
    const onChange = vi.fn();
    const store = new SelectionStore(onChange);
    expect(store.replace(org('a'))).toBe(true);
    expect(store.list.map((n) => n.id)).toEqual(['a']);
    expect(store.primary?.id).toBe('a');
    expect(onChange).toHaveBeenCalledTimes(1);

    expect(store.toggle(org('b'))).toBe(true);
    expect(store.list.map((n) => n.id)).toEqual(['a', 'b']);
    expect(store.clear()).toBe(true);
    expect(store.list).toEqual([]);
  });

  it('failure: no-op replace does not notify', () => {
    const onChange = vi.fn();
    const store = new SelectionStore(onChange);
    store.replace(org('a'));
    onChange.mockClear();
    expect(store.replace(org('a'))).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('success: handlePointerSelect respects ctrl toggle', () => {
    const store = new SelectionStore();
    store.replace(org('a'));
    store.handlePointerSelect(org('b'), { ctrlKey: true, metaKey: false, shiftKey: false });
    expect(store.list.map((n) => n.id)).toEqual(['a', 'b']);
    store.handlePointerSelect(org('c'), { ctrlKey: false, metaKey: false, shiftKey: false });
    expect(store.list.map((n) => n.id)).toEqual(['c']);
  });
});
