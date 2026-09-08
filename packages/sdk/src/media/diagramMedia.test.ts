import { describe, expect, it } from '@rstest/core';
import { expandedOrgIds, mediaUrlsForRef, prefetchOpenMedia } from './diagramMedia.js';
import type { DiagramData, DiagramOrganization } from '../data/types.js';

/**
 * T106 — the media binding, now reachable.
 *
 * All three lived as private members of `OrgHierarchyDiagram`, so none of them
 * could be tested without standing up a diagram. The cycle guard below is the
 * clearest cost of that: it exists because `parentOrgId` is host data, and
 * nothing had ever asserted it.
 */

const org = (id: string, parentOrgId?: string, collapsed = false): DiagramOrganization => ({
  id,
  name: id,
  groupIds: [],
  ...(parentOrgId === undefined ? {} : { parentOrgId }),
  collapsed,
});

const emptyData = (over: Partial<DiagramData> = {}): DiagramData => ({
  organizations: [],
  groups: [],
  departments: [],
  persons: [],
  positions: [],
  reportLines: [],
  ...over,
});

describe('expandedOrgIds', () => {
  it('success: an org is open when no ancestor above it is collapsed', () => {
    const open = expandedOrgIds([org('a'), org('b', 'a'), org('c', 'b')]);
    expect([...open].sort()).toEqual(['a', 'b', 'c']);
  });

  it('failure: a collapsed ancestor hides everything below, not itself', () => {
    // `collapsed` hides children — the org carrying the flag stays open.
    const open = expandedOrgIds([org('a'), org('b', 'a', true), org('c', 'b')]);
    expect([...open].sort()).toEqual(['a', 'b']);
  });

  it('failure: a cycle in parentOrgId terminates instead of spinning forever', () => {
    // The reason the guard set exists: `parentOrgId` is host data, and nothing
    // upstream refuses a loop. Untestable while this lived on the facade.
    const open = expandedOrgIds([org('x', 'y'), org('y', 'x')]);
    expect(open.size).toBe(2);
  });

  it('failure: a parent missing from the payload makes an org a root, not an orphan', () => {
    expect([...expandedOrgIds([org('lonely', 'ghost')])]).toEqual(['lonely']);
  });

  it('failure: no organizations produce no ids and no throw', () => {
    expect(expandedOrgIds([]).size).toBe(0);
  });
});

describe('mediaUrlsForRef', () => {
  it('success: an organisation reports its themed urls and the active one', () => {
    const data = emptyData({
      organizations: [
        { ...org('o1'), symbolUrlLight: '/light.png', symbolUrlDark: '/dark.png' },
      ],
    });
    const urls = mediaUrlsForRef({ data, themeMode: 'light', ref: { kind: 'organization', id: 'o1' } });
    expect(urls).toContain('/light.png');
    expect(urls).toContain('/dark.png');
  });

  it('failure: an organisation nobody knows reports nothing rather than throwing', () => {
    expect(
      mediaUrlsForRef({ data: emptyData(), themeMode: 'light', ref: { kind: 'organization', id: 'ghost' } }),
    ).toEqual([]);
  });

  it('success: a person is reached through `personId` on a non-person ref', () => {
    const data = emptyData({
      persons: [{ id: 'p1', fullName: 'Ada', photoUrl: '/ada.png' }],
    });
    const urls = mediaUrlsForRef({
      data,
      themeMode: 'light',
      ref: { kind: 'position', id: 'pos-1', personId: 'p1' },
    });
    expect(urls).toEqual(['/ada.png']);
  });

  it('failure: a person with no photo yields no url, not an empty string', () => {
    const data = emptyData({ persons: [{ id: 'p1', fullName: 'Ada' }] });
    expect(
      mediaUrlsForRef({ data, themeMode: 'light', ref: { kind: 'person', id: 'p1' } }),
    ).toEqual([]);
  });
});

describe('prefetchOpenMedia', () => {
  const spy = () => {
    const calls: unknown[] = [];
    return { calls, service: { hasPrefetchThemes: true, prefetch: (m: unknown) => calls.push(m) } };
  };

  it('failure: no service, or one that was not asked to prefetch, does nothing', () => {
    expect(() => prefetchOpenMedia({ data: emptyData(), lodLevel: 'near', service: null })).not.toThrow();
    const s = spy();
    prefetchOpenMedia({
      data: emptyData({ organizations: [org('a')] }),
      lodLevel: 'near',
      service: { ...s.service, hasPrefetchThemes: false },
    });
    expect(s.calls).toEqual([]);
  });

  it('failure: at far LOD nothing is preloaded — no card draws an image there', () => {
    const s = spy();
    prefetchOpenMedia({
      data: emptyData({ organizations: [org('a')] }),
      lodLevel: 'far',
      service: s.service,
    });
    expect(s.calls).toEqual([]);
  });

  it('failure: a collapsed branch takes its people with it', () => {
    // The defect this function was written to fix (T97 §В3): it used to walk
    // the whole dataset, collapsed branches included.
    const s = spy();
    prefetchOpenMedia({
      data: emptyData({
        organizations: [org('root'), org('shut', 'root', true), org('hidden', 'shut')],
        positions: [
          { id: 'p-h', title: 'h', organizationId: 'hidden', groupIds: [], status: 'vacant', isTemporary: false, personId: 'per-h' },
        ],
        persons: [{ id: 'per-h', fullName: 'Hidden', photoUrl: '/h.png' }],
      }),
      lodLevel: 'near',
      service: s.service,
    });
    // `root` and `shut` are open (collapsed hides children); `hidden` is not,
    // so its person is never reached.
    expect(s.calls).toHaveLength(2);
  });
});
