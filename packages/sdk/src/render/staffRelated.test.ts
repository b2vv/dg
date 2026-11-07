import { describe, expect, it } from '@rstest/core';
import { relatedStaffIds, staffDimmedIds } from './staffRelated.js';
import { InteractionStore } from '../state/InteractionStore.js';

const lines = Object.freeze([
  Object.freeze({ fromId: 'parent', toId: 'a' }),
  Object.freeze({ fromId: 'a', toId: 'child' }),
  Object.freeze({ fromId: 'cross', toId: 'a' }),
  Object.freeze({ fromId: 'child', toId: 'grandchild' }),
]);
const ids = new Set(['parent', 'a', 'child', 'cross', 'grandchild', 'other']);

describe('staff related selectors', () => {
  it('success: preserves demo hl() one-hop parity for parent, children and cross-department endpoints', () => {
    expect([...relatedStaffIds(lines, 'a')]).toEqual(['a', 'parent', 'child', 'cross']);
    expect([...relatedStaffIds(lines, 'child')]).toEqual(['child', 'a', 'grandchild']);
  });
  it('success: derives dimming from current hover independently of selection (rows 14/15)', () => {
    const store = new InteractionStore();
    store.replace({ kind: 'position', id: 'a' });
    store.setHovered({ kind: 'position', id: 'a' });
    expect([...staffDimmedIds(store.state.hovered, lines, ids)]).toEqual(['grandchild', 'other']);
    store.setHovered({ kind: 'position', id: 'child' });
    expect([...staffDimmedIds(store.state.hovered, lines, ids)]).toEqual(['parent', 'cross', 'other']);
    expect(Object.keys(store.state).sort()).toEqual(['hovered', 'primary', 'selected']);
    expect(store.state.selected).toEqual([{ kind: 'position', id: 'a' }]);
  });
  it('failure boundary: empty and disconnected lines preserve only the hovered id', () => {
    expect([...relatedStaffIds([], 'missing')]).toEqual(['missing']);
    expect([...relatedStaffIds(lines, 'missing')]).toEqual(['missing']);
  });
  it('failure boundary: null, wrong kind and unknown hover do not dim the scene', () => {
    for (const hovered of [null, { kind: 'organization', id: 'a' }, { kind: 'position', id: 'missing' }] as const) {
      expect(staffDimmedIds(hovered, lines, ids).size).toBe(0);
    }
    expect(staffDimmedIds({ kind: 'position', id: 'a' }, lines, new Set()).size).toBe(0);
  });
  it('success: returns fresh derived sets without mutating inputs or retaining output', () => {
    const first = relatedStaffIds(lines, 'a');
    first.clear();
    expect(relatedStaffIds(lines, 'a').size).toBe(4);
    const dimmed = staffDimmedIds({ kind: 'position', id: 'a' }, lines, ids);
    dimmed.clear();
    expect(staffDimmedIds({ kind: 'position', id: 'a' }, lines, ids).size).toBe(2);
    expect(ids.size).toBe(6);
    expect(lines).toHaveLength(4);
  });
});
