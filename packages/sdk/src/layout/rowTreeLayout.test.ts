import { describe, expect, it } from '@rstest/core';
import { computeOrgLayout, computeOrgRowTreeLayout } from './rowTreeLayout.js';
import { revealOrgPath } from '../interaction/revealPath.js';
import type { DiagramOrganization } from '../data/types.js';

function org(id: string, parent?: string, collapsed = false): DiagramOrganization {
  return { id, name: id, groupIds: [], parentOrgId: parent, collapsed };
}

describe('computeOrgRowTreeLayout', () => {
  it('success: 10 org tree has monotonic depth by y', async () => {
    const orgs: DiagramOrganization[] = [
      org('root'),
      org('c1', 'root'),
      org('c2', 'root'),
      org('gc1', 'c1'),
    ];
    for (let i = 3; i < 10; i += 1) {
      orgs.push(org(`extra-${i}`, 'root'));
    }

    const layout = await computeOrgRowTreeLayout(orgs, 'root');
    expect(layout.mode).toBe('row-tree');
    expect(layout.nodes.length).toBeGreaterThanOrEqual(4);

    const root = layout.nodes.find((n) => n.orgId === 'root')!;
    const child = layout.nodes.find((n) => n.orgId === 'c1')!;
    expect(child.y).toBeGreaterThan(root.y);
  });

  it('failure: hanging parentOrgId throws instead of dropping the branch', async () => {
    const orgs = [org('root'), org('ghost', 'missing')];
    await expect(computeOrgLayout(orgs, [])).rejects.toThrow(/unknown parentOrgId/i);
  });

  it('failure: unknown expandedRootId throws', async () => {
    const orgs = [org('a')];
    await expect(computeOrgRowTreeLayout(orgs, 'missing')).rejects.toThrow(/unknown/i);
  });

  it('failure: NaN nodeWidth throws instead of emitting empty paths', async () => {
    await expect(
      computeOrgRowTreeLayout([org('a')], 'a', { nodeWidth: Number.NaN }),
    ).rejects.toThrow(/finite/i);
  });

  it('failure: infinite nodeHeight throws', async () => {
    await expect(
      computeOrgRowTreeLayout([org('a')], 'a', { nodeHeight: Number.POSITIVE_INFINITY }),
    ).rejects.toThrow(/finite/i);
  });

  it('success: expand non-root via revealOrgPath keeps sibling orgs (A12)', async () => {
    const matrix = [
      org('root', undefined, true),
      org('a', 'root', true),
      org('b', 'root', true),
      org('a1', 'a', true),
    ];
    // Bug path: expand only mid-node → layout roots there and drops root/siblings.
    const leafOnly = matrix.map((o) => (o.id === 'a' ? { ...o, collapsed: false } : o));
    const broken = await computeOrgLayout(leafOnly, []);
    expect(broken.nodes.map((n) => n.orgId).sort()).toEqual(['a', 'a1']);

    const fixed = await computeOrgLayout(revealOrgPath(matrix, 'a'), []);
    expect(fixed.nodes.map((n) => n.orgId).sort()).toEqual(['a', 'a1', 'b', 'root']);
  });
});

/**
 * T113 K3 — the collapsed sibling set reaches the layout as chains and comes
 * back as a grid. The two demo tabs the user reported are exactly this shape:
 * an expanded root whose every child is shut.
 */
describe('collapsed siblings lay out as a grid (T113 K3)', () => {
  const rootWith = (n: number, collapsed = true): DiagramOrganization[] => [
    org('root'),
    ...Array.from({ length: n }, (_, i) => ({
      id: `c${i}`,
      name: `c${i}`,
      groupIds: [],
      parentOrgId: 'root',
      collapsed,
      matrixOrder: i,
    })),
  ];

  const childrenOf = (nodes: { orgId: string; x: number; y: number }[]) =>
    nodes.filter((n) => n.orgId !== 'root');
  const distinct = (values: number[]) => new Set(values.map((v) => Math.round(v))).size;

  it('success: four collapsed children make two rows, not one — the Flat orgs case', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(4), 'root');
    const kids = childrenOf(layout.nodes);
    expect(kids).toHaveLength(4);
    expect(distinct(kids.map((n) => n.y))).toBe(2);
    expect(distinct(kids.map((n) => n.x))).toBe(2);
  });

  it('success: nine collapsed children make three rows — the 100k orgs case', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(9), 'root');
    const kids = childrenOf(layout.nodes);
    expect(distinct(kids.map((n) => n.y))).toBe(3);
    expect(distinct(kids.map((n) => n.x))).toBe(3);
  });

  it('success: the diagram gets narrower — the complaint was about width', async () => {
    // Same five nodes both ways. One expanded child (with no children of its
    // own) is enough to disqualify the set, so the comparison isolates the
    // grid rather than the scene.
    const grid = await computeOrgRowTreeLayout(rootWith(4), 'root');
    const row = rootWith(4);
    row[1] = { ...row[1]!, collapsed: false };
    const asRow = await computeOrgRowTreeLayout(row, 'root');
    expect(asRow.nodes).toHaveLength(grid.nodes.length);
    expect(grid.width).toBeLessThan(asRow.width);
  });

  it('success: members carry their cell, and the depth of one level, not of the chain', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(4), 'root');
    const root = layout.nodes.find((n) => n.orgId === 'root')!;
    for (const kid of childrenOf(layout.nodes)) {
      const n = layout.nodes.find((x) => x.orgId === kid.orgId)!;
      expect(n.depth).toBe(root.depth + 1);
      expect(n.parentId).toBe(root.id);
      expect(typeof n.matrixRow).toBe('number');
      expect(typeof n.matrixCol).toBe('number');
    }
  });

  it('failure: no two nodes overlap once the set is a grid', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(9), 'root');
    const overlaps: string[] = [];
    for (let i = 0; i < layout.nodes.length; i += 1) {
      for (let j = i + 1; j < layout.nodes.length; j += 1) {
        const a = layout.nodes[i]!;
        const b = layout.nodes[j]!;
        const hit =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        if (hit) overlaps.push(`${a.orgId}/${b.orgId}`);
      }
    }
    expect(overlaps).toEqual([]);
  });

  it('failure: one expanded sibling keeps the old single row', async () => {
    const orgs = rootWith(4);
    orgs[2] = { ...orgs[2]!, collapsed: false };
    const layout = await computeOrgRowTreeLayout(orgs, 'root');
    expect(distinct(childrenOf(layout.nodes).map((n) => n.y))).toBe(1);
  });

  it('failure: a single collapsed child is not a grid and gets no cell', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(1), 'root');
    const kid = childrenOf(layout.nodes)[0]!;
    expect(layout.nodes.find((n) => n.orgId === kid.orgId)?.matrixRow).toBeUndefined();
  });

  it('failure: the rows a grid adds count against the depth guard, and say so', async () => {
    // Real depth 2499 is inside the limit; the grid's three rows push the tree
    // two levels deeper, which is not. The refusal has to name the grid,
    // because the host never asked for one and cannot otherwise tell why a
    // tree it knows to be legal was refused.
    const orgs: DiagramOrganization[] = [org('d0')];
    for (let i = 1; i < 2498; i += 1) orgs.push(org(`d${i}`, `d${i - 1}`));
    for (let i = 0; i < 9; i += 1) {
      orgs.push({
        id: `leaf${i}`,
        name: `leaf${i}`,
        groupIds: [],
        parentOrgId: 'd2497',
        collapsed: true,
        matrixOrder: i,
      });
    }
    await expect(computeOrgRowTreeLayout(orgs, 'd0')).rejects.toThrow(/grid/i);
  });
});
