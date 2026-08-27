import { describe, expect, it } from '@rstest/core';
import { bulkContextMenuItems, defaultContextMenuItems } from './contextMenu.js';
import type { NodeRef } from './types.js';

const org = (id: string): NodeRef => ({ kind: 'organization', id });
const person = (id: string): NodeRef => ({ kind: 'person', id });

describe('defaultContextMenuItems with a multi-selection', () => {
  it('success: clicked node inside a multi-selection gets bulk items', () => {
    const selection = [org('a'), org('b')];
    const ids = defaultContextMenuItems(org('a'), { selection }).map((i) => i.id);
    expect(ids).toEqual(['bulk-expand', 'bulk-collapse', 'bulk-copy-ids', 'bulk-clear']);
  });

  it('failure: a node outside the selection keeps its single-node menu', () => {
    const selection = [org('a'), org('b')];
    const ids = defaultContextMenuItems(org('other'), { selection }).map((i) => i.id);
    expect(ids).toEqual(['expand', 'collapse', 'focus-subtree', 'copy-id']);
  });

  it('failure: a single selection is not bulk', () => {
    const ids = defaultContextMenuItems(person('p1'), { selection: [person('p1')] }).map((i) => i.id);
    expect(ids).toEqual(['focus', 'copy-id']);
  });
});

describe('bulkContextMenuItems', () => {
  it('success: organization-only sets can expand/collapse in bulk', () => {
    const items = bulkContextMenuItems([org('a'), org('b'), org('c')]);
    expect(items[0]).toEqual({ id: 'bulk-expand', label: 'Expand 3 organizations' });
    expect(items.map((i) => i.id)).toContain('bulk-collapse');
  });

  it('failure: mixed kinds drop the org-only actions', () => {
    const ids = bulkContextMenuItems([org('a'), person('p1')]).map((i) => i.id);
    expect(ids).toEqual(['bulk-copy-ids', 'bulk-clear']);
  });
});
