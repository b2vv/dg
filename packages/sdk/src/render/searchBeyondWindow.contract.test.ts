import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { HostSearchPage, OrgHierarchyCallbacks } from '../callbacks.js';

/**
 * Acceptance rows 16-20 and 24 — every way a host search callback can let the
 * diagram down.
 *
 * The callback is somebody else's code reached across an await, so all six are
 * about the same thing from different sides: a caller must never be told «no
 * matches» when the truth is «nobody answered», and a late answer must not
 * overwrite a newer question.
 */

function data() {
  return {
    organizations: [{ id: 'org-1', name: 'Root', groupIds: [], collapsed: false, matrixOrder: 0 }],
    groups: [],
    departments: [],
    persons: [{ id: 'p-1', fullName: 'Ada Lovelace' }],
    positions: [
      {
        id: 'pos-1',
        title: 'Analyst',
        organizationId: 'org-1',
        groupIds: [],
        personId: 'p-1',
        status: 'filled' as const,
        isTemporary: false,
        isHead: true,
      },
    ],
    reportLines: [],
    orgLinks: [] as const,
  };
}

async function mount(callbacks: OrgHierarchyCallbacks = {}) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: data(),
    useWorker: false,
    callbacks,
  });
  return { container, diagram };
}

const page = (over: Partial<HostSearchPage> = {}): HostSearchPage => ({
  hits: [{ id: 'pos-1', label: 'Ada Lovelace' }],
  total: 25_000,
  hasMore: true,
  ...over,
});

describe('searchBeyondWindow (T88.9)', () => {
  it('success: the host answer carries a total the window could not know', async () => {
    const { diagram } = await mount({ searchBeyondWindow: async () => page() });
    const r = await diagram.searchAll('ada');
    expect(r.source).toBe('host');
    expect(r.total).toBe(25_000);
    expect(r.hasMore).toBe(true);
    expect(r.hits.map((h) => h.label)).toEqual(['Ada Lovelace']);
    diagram.destroy();
  });

  it('row 17: with no callback the behaviour is exactly what it is today', async () => {
    const { diagram } = await mount();
    const r = await diagram.searchAll('ada');
    const plain = await diagram.search('ada');
    expect(r.source).toBe('window');
    expect(r.unavailable).toBeUndefined();
    expect(r.hits.map((h) => h.node.id)).toEqual(plain.map((h) => h.node.id));
    expect(r.total).toBe(plain.length);
    diagram.destroy();
  });

  it('row 16: a callback that throws is named, and local hits survive', async () => {
    const { diagram } = await mount({
      searchBeyondWindow: async () => {
        throw new Error('index unreachable');
      },
    });
    const r = await diagram.searchAll('ada');
    expect(r.unavailable).toContain('index unreachable');
    // The local window still found something, and dropping it because the
    // remote half failed would lose results the diagram was holding all along.
    expect(r.hits.length).toBeGreaterThan(0);
    diagram.destroy();
  });

  it('row 24: a malformed payload reads as unavailable, never as «no matches»', async () => {
    for (const bad of [
      null,
      'nope',
      { hits: 'no', total: 1, hasMore: false },
      { hits: [], total: -1, hasMore: false },
      { hits: [], total: 1 },
      { hits: [{ id: 1, label: 'x' }], total: 1, hasMore: false },
    ]) {
      const { diagram } = await mount({
        searchBeyondWindow: async () => bad as unknown as HostSearchPage,
      });
      const r = await diagram.searchAll('ada');
      expect(r.unavailable).toBeDefined();
      expect(r.source).toBe('window');
      diagram.destroy();
    }
  });

  it('row 18: a slow answer overtaken by a newer query is discarded', async () => {
    const delays: Record<string, number> = { slow: 60, fast: 5 };
    const { diagram } = await mount({
      searchBeyondWindow: async (query) => {
        await new Promise((r) => setTimeout(r, delays[query] ?? 0));
        return page({ total: query === 'slow' ? 111 : 222 });
      },
    });
    const first = diagram.searchAll('slow');
    // Asked second, so it is the question that counts.
    const second = await diagram.searchAll('fast');
    const late = await first;

    expect(second.total).toBe(222);
    expect(second.source).toBe('host');
    // The stale answer does not come back as a host result — its total would be
    // the count for text the user has already replaced.
    expect(late.source).toBe('window');
    diagram.destroy();
  });

  it('row 19: destroy() during the await writes nothing and rejects nothing', async () => {
    const { diagram } = await mount({
      searchBeyondWindow: async () => {
        await new Promise((r) => setTimeout(r, 40));
        return page();
      },
    });
    const pending = diagram.searchAll('ada');
    diagram.destroy();
    // The check on entry cannot see this; the one after the await can.
    const r = await pending;
    expect(r.source).toBe('window');
    expect(r.hits).toEqual([]);
  });

  it('row 20: a hit the scene cannot resolve is reported, not silently dropped', async () => {
    const { diagram } = await mount({
      searchBeyondWindow: async () =>
        page({ hits: [{ id: 'pos-1', label: 'Ada' }, { id: 'pos-999999', label: 'Ghost' }] }),
    });
    const r = await diagram.searchAll('ada');
    expect(r.unresolved).toEqual(['pos-999999']);
    // A hit that resolves to nothing is one the user clicks and nothing happens.
    expect(r.hits.map((h) => h.label)).toEqual(['Ada']);
    diagram.destroy();
  });

  it('failure: searchAll on a destroyed diagram answers empty rather than throwing', async () => {
    const { diagram } = await mount({ searchBeyondWindow: async () => page() });
    diagram.destroy();
    const r = await diagram.searchAll('ada');
    expect(r).toEqual({ hits: [], total: 0, hasMore: false, source: 'window' });
  });
});
