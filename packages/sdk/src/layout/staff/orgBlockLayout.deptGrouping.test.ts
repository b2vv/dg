import { describe, expect, it } from '@rstest/core';
import type { DiagramDepartment, DiagramPosition, DiagramReportLine } from '../../data/types.js';
import { aabbOverlap } from './coords.js';
import { layoutStaffOrgBlock } from './orgBlockLayout.js';
import type { StaffNodeBox } from './types.js';

const orgId = 'org';
const departments: readonly DiagramDepartment[] = [
  { id: 'a', name: 'A', organizationId: orgId },
  { id: 'b', name: 'B', organizationId: orgId },
];

function position(id: string, departmentId: string): DiagramPosition {
  return { id, departmentId, title: id, organizationId: orgId, groupIds: [], status: 'filled', isTemporary: false };
}

function admin(fromId: string, toId: string): DiagramReportLine {
  return { fromId, toId, kind: 'admin' };
}

function departmentBounds(nodes: StaffNodeBox[], positions: DiagramPosition[], departmentId: string) {
  const ids = new Set(positions.filter((p) => p.departmentId === departmentId).map((p) => p.id));
  const members = nodes.filter((node) => ids.has(node.id));
  expect(members).toHaveLength(ids.size);
  const x = Math.min(...members.map((node) => node.x));
  const y = Math.min(...members.map((node) => node.y));
  return {
    x, y,
    width: Math.max(...members.map((node) => node.x + node.width)) - x,
    height: Math.max(...members.map((node) => node.y + node.height)) - y,
  };
}

function nodeX(nodes: StaffNodeBox[], id: string): number {
  const node = nodes.find((box) => box.id === id);
  if (!node) throw new Error(`Missing node ${id}`);
  return node.x;
}

function nodesById(r: { nodes: StaffNodeBox[] }): Map<string, string> {
  return new Map(r.nodes.map((n) => [n.id, `${n.x},${n.y},${n.depth},${n.role}`]));
}

const chain = [position('a1', 'a'), position('b1', 'b'), position('a2', 'a'), position('b2', 'b')];
const chainReports = [admin('a1', 'b1'), admin('b1', 'a2'), admin('a2', 'b2')];

describe('layoutStaffOrgBlock department grouping', () => {
  it('separates department unions that overlap with grouping off', async () => {
    const legacy = await layoutStaffOrgBlock(chain, chainReports, orgId, { departments });
    const grouped = await layoutStaffOrgBlock(chain, chainReports, orgId, { deptGrouping: true, departments });
    expect(legacy.mode).toBe('tree');
    expect(grouped.mode).toBe('tree');
    expect(aabbOverlap(departmentBounds(legacy.nodes, chain, 'a'), departmentBounds(legacy.nodes, chain, 'b'), 0, 0)).toBe(true);
    expect(aabbOverlap(departmentBounds(grouped.nodes, chain, 'a'), departmentBounds(grouped.nodes, chain, 'b'), 0, 0)).toBe(false);
    expect(grouped.edges).toEqual(legacy.edges);
  });

  it('keeps the default tree layout identical to explicitly disabled grouping', async () => {
    const legacy = await layoutStaffOrgBlock(chain, chainReports, orgId);
    const disabled = await layoutStaffOrgBlock(chain, chainReports, orgId, { deptGrouping: false, departments });
    expect(legacy.mode).toBe('tree');
    expect(nodesById(disabled)).toEqual(nodesById(legacy));
    expect(disabled.mode).toBe(legacy.mode);
    expect(disabled.edges).toEqual(legacy.edges);
    expect(disabled.diagnostics).toEqual(legacy.diagnostics);
    expect([disabled.width, disabled.height]).toEqual([legacy.width, legacy.height]);
  });

  it('accepts repeated cross-department member hints and preserves the unhinted canonical tail', async () => {
    const positions = [position('root', 'a'), position('a2', 'a'), position('b2', 'b'), position('a1', 'a'), position('b1', 'b'), position('b0', 'b')];
    const reports = [admin('root', 'a1'), admin('root', 'a2'), admin('root', 'b0'), admin('b0', 'b1'), admin('b0', 'b2')];
    const first = await layoutStaffOrgBlock(positions, reports, orgId, {
      deptGrouping: true, departments, memberOrder: ['a2', 'b2', 'a1', 'b1'],
    });
    const second = await layoutStaffOrgBlock(positions, reports, orgId, {
      deptGrouping: true, departments, memberOrder: ['a1', 'b1', 'a2', 'b2'],
    });
    // gap#6 fix (org_tree.rs): x-order зберігає порядок членів — ранніший у memberOrder лівіше.
    for (const prefix of ['a', 'b']) {
      expect(nodeX(first.nodes, `${prefix}2`)).toBeLessThan(nodeX(first.nodes, `${prefix}1`));
      expect(nodeX(second.nodes, `${prefix}1`)).toBeLessThan(nodeX(second.nodes, `${prefix}2`));
    }
    const partial = await layoutStaffOrgBlock(positions, reports, orgId, {
      deptGrouping: true, departments, memberOrder: ['missing', 'a2'],
    });
    // a2 запінено першим → лівіше за unranked a1; b-хвіст лишається канонічним (b1 перед b2).
    expect(nodeX(partial.nodes, 'a2')).toBeLessThan(nodeX(partial.nodes, 'a1'));
    expect(nodeX(partial.nodes, 'b1')).toBeLessThan(nodeX(partial.nodes, 'b2'));
  });

  it('falls back to the legacy tree for an admin cycle with an explicit staff head', async () => {
    const positions = [{ ...position('a', 'a'), isHead: true }, position('b', 'b')];
    const reports = [admin('a', 'b'), admin('b', 'a')];
    const result = await layoutStaffOrgBlock(positions, reports, orgId, { deptGrouping: true, departments });
    expect(result.mode).toBe('tree');
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['a', 'b']);
    expect(result.diagnostics).toContain('dept-grouping skipped (cycle)');
    const legacy = await layoutStaffOrgBlock(positions, reports, orgId);
    expect(result.nodes).toEqual(legacy.nodes);
  });

  it('normalizes unknown departments to loose without mutating input and uses canonical order', async () => {
    const positions = [position('z', 'a'), { ...position('root', 'a'), isHead: true }, position('a', 'a'), position('unknown', 'stale')];
    const reports = [admin('root', 'z'), admin('root', 'a'), admin('root', 'unknown')];
    for (const p of positions) Object.freeze(p);
    Object.freeze(positions);
    const options = { deptGrouping: true, departments };
    const result = await layoutStaffOrgBlock(positions, reports, orgId, options);
    const reversed = await layoutStaffOrgBlock(positions.map((_, i) => positions[positions.length - 1 - i]!), reports, orgId, options);
    expect(nodesById(reversed)).toEqual(nodesById(result));
    expect(reversed.mode).toBe(result.mode);
    expect(reversed.edges).toEqual(result.edges);
    expect(reversed.diagnostics).toEqual(result.diagnostics);
    expect([reversed.width, reversed.height]).toEqual([result.width, result.height]);
    expect(result.nodes).toHaveLength(4);
    expect(nodeX(result.nodes, 'a')).toBeLessThan(nodeX(result.nodes, 'z'));
    const dept = departmentBounds(result.nodes, positions, 'a');
    expect(nodeX(result.nodes, 'unknown')).toBeGreaterThan(dept.x + dept.width);
    expect(result.diagnostics).toContain('unknown-department:unknown:stale');
    expect(positions.find((p) => p.id === 'unknown')?.departmentId).toBe('stale');
  });
});
