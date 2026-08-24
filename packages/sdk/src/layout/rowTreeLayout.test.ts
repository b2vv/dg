import { describe, expect, it } from 'vitest';
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
