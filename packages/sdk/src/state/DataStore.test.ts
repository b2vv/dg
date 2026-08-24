import { describe, expect, it } from 'vitest';
import { DataStore } from './DataStore.js';
import { emptyDiagramData } from '../data/types.js';

describe('DataStore (T76)', () => {
  it('success: replace and update', () => {
    const store = new DataStore();
    expect(store.snapshot.organizations).toEqual([]);
    store.replace({
      ...emptyDiagramData(),
      organizations: [{ id: 'o1', name: 'O', groupIds: [] }],
    });
    expect(store.snapshot.organizations).toHaveLength(1);
    store.update((d) => ({
      ...d,
      organizations: [...d.organizations, { id: 'o2', name: 'P', groupIds: [] }],
    }));
    expect(store.snapshot.organizations.map((o) => o.id)).toEqual(['o1', 'o2']);
  });
});
