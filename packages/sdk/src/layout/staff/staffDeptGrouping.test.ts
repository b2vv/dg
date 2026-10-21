import { describe, expect, it } from '@rstest/core';
import {
  NO_DEPARTMENT_ID,
  type DiagramDepartment,
  type DiagramPosition,
  type DiagramReportLine,
} from '../../data/types.js';
import { aabbOverlap, resolveGeom } from './coords.js';
import { layoutStaffOrgBlock } from './orgBlockLayout.js';
import { groupStaffByDepartment } from './staffDeptGrouping.js';
import type { StaffNodeBox } from './types.js';

const orgId = 'org';
const geom = resolveGeom();

function position(id: string, departmentId?: string): DiagramPosition {
  return {
    id,
    departmentId,
    title: id,
    organizationId: orgId,
    groupIds: [],
    status: 'filled',
    isTemporary: false,
  };
}

function department(id: string, order?: number): DiagramDepartment {
  return { id, name: id, organizationId: orgId, order };
}

function admin(fromId: string, toId: string): DiagramReportLine {
  return { fromId, toId, kind: 'admin' };
}

function bounds(nodes: StaffNodeBox[]) {
  expect(nodes.length).toBeGreaterThan(0);
  const x = Math.min(...nodes.map((node) => node.x));
  const y = Math.min(...nodes.map((node) => node.y));
  return {
    x,
    y,
    width: Math.max(...nodes.map((node) => node.x + node.width)) - x,
    height: Math.max(...nodes.map((node) => node.y + node.height)) - y,
  };
}

function nodeX(nodes: StaffNodeBox[], id: string): number {
  const node = nodes.find((box) => box.id === id);
  if (!node) throw new Error(`Missing node ${id}`);
  return node.x;
}

describe('groupStaffByDepartment', () => {
  it('separates department AABBs that overlap in the legacy report tree', async () => {
    // Alternating departments along one vertical chain have overlapping unions.
    const positions = [
      position('a1', 'a'),
      position('b1', 'b'),
      position('a2', 'a'),
      position('b2', 'b'),
    ];
    const reports = [admin('a1', 'b1'), admin('b1', 'a2'), admin('a2', 'b2')];
    const departments = [department('a', 0), department('b', 1), department('empty')];
    const legacy = await layoutStaffOrgBlock(positions, reports, orgId);
    const legacyA = bounds(legacy.nodes.filter((node) => node.id.startsWith('a')));
    const legacyB = bounds(legacy.nodes.filter((node) => node.id.startsWith('b')));
    expect(aabbOverlap(legacyA, legacyB, 0, 0)).toBe(true);

    const result = await groupStaffByDepartment(positions, reports, departments, orgId, geom);
    expect([...result.memberBoxesByDept.keys()]).toEqual(['a', 'b']);
    const a = result.memberBoxesByDept.get('a') ?? [];
    const b = result.memberBoxesByDept.get('b') ?? [];
    expect(a.map((node) => node.id).sort()).toEqual(['a1', 'a2']);
    expect(b.map((node) => node.id).sort()).toEqual(['b1', 'b2']);
    expect(aabbOverlap(bounds(a), bounds(b), geom.horizontalGap, geom.verticalGap)).toBe(false);
    expect(result.nodes).toHaveLength(4);
    expect(result.nodes.every((node) => node.role === 'tree')).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('changes block x-order when department order changes', async () => {
    const positions = [position('a1', 'a'), position('b1', 'b')];
    const before = await groupStaffByDepartment(
      positions,
      [],
      [department('b', 1), department('a', 0)],
      orgId,
      geom,
    );
    const after = await groupStaffByDepartment(
      positions,
      [],
      [department('b', 0), department('a', 1)],
      orgId,
      geom,
    );
    expect(nodeX(before.nodes, 'a1')).toBeLessThan(nodeX(before.nodes, 'b1'));
    expect(nodeX(after.nodes, 'b1')).toBeLessThan(nodeX(after.nodes, 'a1'));
  });

  it('breaks equal/default department orders by id, independently of array order', async () => {
    const positions = [position('b1', 'b'), position('a1', 'a')];
    const departments = [department('b', 0), department('a')];
    const first = await groupStaffByDepartment(positions, [], departments, orgId, geom);
    const reversed = await groupStaffByDepartment(
      positions,
      [],
      departments.map((_, i) => departments[departments.length - 1 - i]!),
      orgId,
      geom,
    );
    expect(nodeX(first.nodes, 'a1')).toBeLessThan(nodeX(first.nodes, 'b1'));
    expect(reversed.nodes).toEqual(first.nodes);
  });

  it('injects member input order into WASM sibling x-order, with a later root', async () => {
    const root = position('root', 'a');
    const z = position('z', 'a');
    const a = position('a', 'a');
    const reports = [admin('root', 'a'), admin('root', 'z')];
    const departments = [department('a')];
    const first = await groupStaffByDepartment([z, root, a], reports, departments, orgId, geom);
    const reversed = await groupStaffByDepartment([a, root, z], reports, departments, orgId, geom);
    // Verified x-order reverses input order; see ploeg_layout.rs:48 node.children.iter().rev().
    expect(nodeX(first.nodes, 'a')).toBeLessThan(nodeX(first.nodes, 'z'));
    expect(nodeX(reversed.nodes, 'z')).toBeLessThan(nodeX(reversed.nodes, 'a'));
    const rootBox = first.nodes.find((node) => node.id === 'root');
    const childBox = first.nodes.find((node) => node.id === 'z');
    expect(rootBox?.y).toBeLessThan(childBox?.y ?? 0);
  });

  it('places loose seats after departments without a synthetic department key', async () => {
    const result = await groupStaffByDepartment(
      [position('loose'), position('a1', 'a')],
      [],
      [department('a')],
      orgId,
      geom,
    );
    expect([...result.memberBoxesByDept.keys()]).toEqual(['a']);
    expect(result.memberBoxesByDept.has(NO_DEPARTMENT_ID)).toBe(false);
    expect(nodeX(result.nodes, 'loose')).toBeGreaterThan(nodeX(result.nodes, 'a1'));
    expect(
      aabbOverlap(
        bounds(result.nodes.filter((node) => node.id === 'loose')),
        bounds(result.memberBoxesByDept.get('a') ?? []),
        geom.horizontalGap,
        geom.verticalGap,
      ),
    ).toBe(false);

    const looseOnly = await groupStaffByDepartment([position('loose')], [], [], orgId, geom);
    expect(looseOnly.memberBoxesByDept.size).toBe(0);
    expect(looseOnly.nodes.map((node) => node.id)).toEqual(['loose']);
  });

  it('is deterministic and leaves frozen inputs untouched', async () => {
    const positions = [
      position('a1', 'a'),
      { ...position('b1', 'b'), width: 400 },
      position('loose'),
    ];
    const reports = [admin('a1', 'b1')];
    const departments = [department('b', 1), department('a', 0)];
    for (const values of [positions, reports, departments]) {
      for (const value of values) Object.freeze(value);
      Object.freeze(values);
    }
    const first = await groupStaffByDepartment(positions, reports, departments, orgId, geom);
    const second = await groupStaffByDepartment(positions, reports, departments, orgId, geom);
    expect(second.nodes).toEqual(first.nodes);
    expect(second.nodes[0]).not.toBe(first.nodes[0]);
    const regions = [
      ...first.memberBoxesByDept.values(),
      first.nodes.filter((node) => node.id === 'loose'),
    ];
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        expect(
          aabbOverlap(
            bounds(regions[i] ?? []),
            bounds(regions[j] ?? []),
            geom.horizontalGap,
            geom.verticalGap,
          ),
        ).toBe(false);
      }
    }
  });

  it('returns no regions for an empty org block', async () => {
    expect(await groupStaffByDepartment([], [], [department('a')], orgId, geom)).toEqual({
      nodes: [],
      memberBoxesByDept: new Map(),
      diagnostics: [],
    });
  });
});
