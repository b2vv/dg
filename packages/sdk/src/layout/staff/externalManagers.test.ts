import { describe, expect, it } from '@rstest/core';
import { externalManagersFor, pinExternalManagers } from './externalManagers.js';
import { resolveGeom } from './coords.js';
import type { StaffOrgBlockResult } from './types.js';
import type { DiagramPosition, DiagramReportLine } from '../../data/types.js';

/** T91 rows 25-27 — a manager from another organisation gets a card. */

const geom = resolveGeom();

const seat = (id: string, organizationId: string): DiagramPosition => ({
  id,
  title: id,
  organizationId,
  groupIds: [],
  status: 'vacant',
  isTemporary: false,
});

const admin = (fromId: string, toId: string): DiagramReportLine => ({
  fromId,
  toId,
  kind: 'admin',
});

const ours = [seat('head', 'ours'), seat('a', 'ours'), seat('b', 'ours')];
const outside = seat('boss', 'other');
const allIds = new Set([...ours, outside].map((p) => p.id));

/** A block as the layout would hand it over: two rows, nothing pinned yet. */
function block(): StaffOrgBlockResult {
  return {
    organizationId: 'ours',
    mode: 'tree',
    nodes: [
      { id: 'head', organizationId: 'ours', x: 32, y: 32, width: 136, height: 156, role: 'tree' },
      { id: 'a', organizationId: 'ours', x: 32, y: 216, width: 136, height: 156, role: 'tree' },
      { id: 'b', organizationId: 'ours', x: 188, y: 216, width: 136, height: 156, role: 'tree' },
    ],
    edges: [
      { fromId: 'head', toId: 'a', kind: 'admin' },
      { fromId: 'head', toId: 'b', kind: 'admin' },
    ],
    width: 356,
    height: 404,
    diagnostics: [],
  };
}

describe('external managers (T91 rows 25-27)', () => {
  it('finds a manager that supervises us from another organisation', () => {
    const pins = externalManagersFor(ours, [admin('boss', 'a')]);
    expect(pins).toEqual([{ managerId: 'boss', reportIds: ['a'] }]);
  });

  it('ignores supervision that stays inside — that is the block’s own job', () => {
    expect(externalManagersFor(ours, [admin('head', 'a')])).toEqual([]);
  });

  it('ignores a line that merely passes by: neither end is ours', () => {
    expect(externalManagersFor(ours, [admin('boss', 'stranger')])).toEqual([]);
  });

  it('row 25: the outside manager becomes a card above the block', () => {
    const pinned = pinExternalManagers(block(), ours, [admin('boss', 'a')], allIds, geom);
    const ghost = pinned.nodes.find((n) => n.id === 'boss');
    expect(ghost).toBeDefined();
    expect(ghost!.role).toBe('external');
    // Above every seat that does belong here.
    for (const n of pinned.nodes.filter((x) => x.id !== 'boss')) {
      expect(ghost!.y).toBeLessThan(n.y);
    }
  });

  it('row 25: the reporting line now has somewhere to end', () => {
    const pinned = pinExternalManagers(block(), ours, [admin('boss', 'a')], allIds, geom);
    expect(pinned.edges).toContainEqual({ fromId: 'boss', toId: 'a', kind: 'admin' });
  });

  it('row 25: the block keeps its own arrangement, moved down as one', () => {
    const before = block();
    const pinned = pinExternalManagers(before, ours, [admin('boss', 'a')], allIds, geom);
    const shift = pinned.nodes.find((n) => n.id === 'head')!.y - before.nodes[0]!.y;
    expect(shift).toBeGreaterThan(0);
    for (const n of before.nodes) {
      const after = pinned.nodes.find((x) => x.id === n.id)!;
      // Same relative layout — only the whole block moved.
      expect(after.y - n.y).toBe(shift);
      expect(after.x).toBe(n.x);
    }
    expect(pinned.height).toBe(before.height + shift);
  });

  it('row 26: the pin is not one of the organisation’s positions', () => {
    const pinned = pinExternalManagers(block(), ours, [admin('boss', 'a')], allIds, geom);
    const members = pinned.nodes.filter((n) => n.role !== 'external');
    expect(members.map((n) => n.id).sort()).toEqual(['a', 'b', 'head']);
  });

  it('row 27: two reports of one outside manager share a single card', () => {
    const pinned = pinExternalManagers(
      block(),
      ours,
      [admin('boss', 'a'), admin('boss', 'b')],
      allIds,
      geom,
    );
    expect(pinned.nodes.filter((n) => n.id === 'boss')).toHaveLength(1);
    expect(pinned.edges).toContainEqual({ fromId: 'boss', toId: 'a', kind: 'admin' });
    expect(pinned.edges).toContainEqual({ fromId: 'boss', toId: 'b', kind: 'admin' });
  });

  it('two different outside managers get a card each, side by side', () => {
    const ids = new Set([...allIds, 'boss2']);
    const pinned = pinExternalManagers(
      block(),
      ours,
      [admin('boss', 'a'), admin('boss2', 'b')],
      ids,
      geom,
    );
    const ghosts = pinned.nodes.filter((n) => n.role === 'external');
    expect(ghosts).toHaveLength(2);
    expect(ghosts[0]!.y).toBe(ghosts[1]!.y);
    expect(ghosts[0]!.x).not.toBe(ghosts[1]!.x);
  });

  it('a manager the host never sent is not drawn from nothing', () => {
    // The id is in `reportLines` but in no position — there is no card to make
    // and no name to put on it, so the line stays undrawn rather than becoming
    // an empty box.
    const pinned = pinExternalManagers(block(), ours, [admin('ghost-id', 'a')], allIds, geom);
    expect(pinned.nodes).toHaveLength(3);
    expect(pinned.edges).toHaveLength(2);
  });

  it('nothing to pin leaves the block untouched, object and all', () => {
    const before = block();
    expect(pinExternalManagers(before, ours, [admin('head', 'a')], allIds, geom)).toBe(before);
  });
});
