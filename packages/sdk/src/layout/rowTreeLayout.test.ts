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

  it('failure: no two nodes overlap when grids sit on more than one level', async () => {
    // The single-scene version of this check proves the geometry only where it
    // was written. Two grids on different levels is where a mistake would
    // actually show: the deeper one grows downward into space the layout
    // separated for a set it thought was one row deep.
    const orgs: DiagramOrganization[] = [org('root'), org('a', 'root'), org('b', 'root')];
    for (let i = 0; i < 4; i += 1) {
      orgs.push({
        id: `a${i}`, name: `a${i}`, groupIds: [], parentOrgId: 'a', collapsed: true, matrixOrder: i,
      });
    }
    for (let i = 0; i < 9; i += 1) {
      orgs.push({
        id: `b${i}`, name: `b${i}`, groupIds: [], parentOrgId: 'b', collapsed: true, matrixOrder: i,
      });
    }
    const layout = await computeOrgRowTreeLayout(orgs, 'root');
    const overlaps: string[] = [];
    for (let i = 0; i < layout.nodes.length; i += 1) {
      for (let j = i + 1; j < layout.nodes.length; j += 1) {
        const p1 = layout.nodes[i]!;
        const p2 = layout.nodes[j]!;
        if (
          p1.x < p2.x + p2.width &&
          p2.x < p1.x + p1.width &&
          p1.y < p2.y + p2.height &&
          p2.y < p1.y + p1.height
        ) {
          overlaps.push(`${p1.orgId}/${p2.orgId}`);
        }
      }
    }
    expect(overlaps).toEqual([]);
    // …and both sets really did become grids, or the check above proves nothing
    // `/^b\d/`, not `startsWith('b')`: the parent is called `b` too, and
    // counting its row made the assertion read 4 where the grid has 3.
    const bRows = layout.nodes.filter((n) => /^b\d/.test(n.orgId)).map((n) => Math.round(n.y));
    expect(new Set(bRows).size).toBe(3);
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

/**
 * T113 K4 — a grid is reached by a spine, not by nine separate paths.
 *
 * The chain the transform builds is a transport detail; leaving its edges on
 * screen would draw the ladder we used to get the geometry. The spine is the
 * shape the host already has (trunk / bus / riser) and the one the global
 * matrix already draws here, so both matrices end up looking alike.
 */
describe('a collapsed-sibling grid is wired by a spine (T113 K4)', () => {
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

  it('failure: no edge is left running between two members of the grid', async () => {
    // Those are the chain edges. They exist only because a column of the grid
    // travels as a chain, and the host has no business seeing them.
    const layout = await computeOrgRowTreeLayout(rootWith(9), 'root');
    const members = new Set(['c0','c1','c2','c3','c4','c5','c6','c7','c8']);
    const chainEdges = layout.edges.filter((e) => members.has(e.fromId) && members.has(e.toId));
    expect(chainEdges).toEqual([]);
  });

  it('success: every member of the grid is reachable — none is left unwired', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(9), 'root');
    for (let i = 0; i < 9; i += 1) {
      expect(layout.edges.some((e) => e.toId === `c${i}`)).toBe(true);
    }
  });

  it('success: the wiring starts at the parent, so the grid hangs off the tree', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(9), 'root');
    expect(layout.edges.some((e) => e.fromId === 'root')).toBe(true);
  });

  it('success: every edge into a member ends inside that member`s box', async () => {
    const layout = await computeOrgRowTreeLayout(rootWith(4), 'root');
    const boxOf = (id: string) => layout.nodes.find((n) => n.orgId === id)!;
    for (let i = 0; i < 4; i += 1) {
      const edge = layout.edges.find((e) => e.toId === `c${i}`)!;
      const last = /([ML])\s*(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)\s*$/.exec(edge.path)!;
      const x = Number(last[2]);
      const y = Number(last[3]);
      const b = boxOf(`c${i}`);
      expect(x).toBeGreaterThanOrEqual(b.x - 1);
      expect(x).toBeLessThanOrEqual(b.x + b.width + 1);
      expect(y).toBeGreaterThanOrEqual(b.y - 1);
      expect(y).toBeLessThanOrEqual(b.y + b.height + 1);
    }
  });

  it('success: the members of a row hang off ONE shared bus, not a path each', async () => {
    // The third clause of A6, and the one the first pass of these tests missed:
    // «every path of the set shares a bus segment». Reachability and endpoints
    // were asserted; sharing was not, so nine separate paths would have passed.
    const layout = await computeOrgRowTreeLayout(rootWith(4), 'root');
    const points = (path: string) =>
      [...path.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g)].map((m) => ({
        x: Number(m[1]),
        y: Number(m[2]),
      }));

    // A bus is the horizontal run the builder emits between its own endpoints.
    const buses = layout.edges
      .filter((e) => e.fromId.includes('__bus'))
      .map((e) => points(e.path))
      .filter((p) => p.length >= 2 && Math.abs(p[0]!.y - p[1]!.y) < 0.01)
      .map((p) => ({ y: p[0]!.y, x1: Math.min(p[0]!.x, p[1]!.x), x2: Math.max(p[0]!.x, p[1]!.x) }));

    // Two grid rows, so two buses — not one per member.
    expect(buses).toHaveLength(2);

    for (let i = 0; i < 4; i += 1) {
      const start = points(layout.edges.find((e) => e.toId === `c${i}`)!.path)[0]!;
      const onABus = buses.some(
        (b) => Math.abs(b.y - start.y) < 0.01 && start.x >= b.x1 - 1 && start.x <= b.x2 + 1,
      );
      expect(onABus, `riser into c${i} does not start on a bus`).toBe(true);
    }
  });

  it('failure: a set that is not a grid keeps one edge per child, as before', async () => {
    // The regression half: nothing about ordinary row-tree wiring changes.
    const orgs = rootWith(4);
    orgs[2] = { ...orgs[2]!, collapsed: false };
    const layout = await computeOrgRowTreeLayout(orgs, 'root');
    for (let i = 0; i < 4; i += 1) {
      const into = layout.edges.filter((e) => e.toId === `c${i}`);
      expect(into).toHaveLength(1);
      expect(into[0]?.fromId).toBe('root');
    }
  });
});
