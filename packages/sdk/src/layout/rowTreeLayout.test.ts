import { describe, expect, it } from 'vitest';
import { computeOrgRowTreeLayout } from './rowTreeLayout.js';
import type { DiagramOrganization } from '../data/types.js';

function org(id: string, parent?: string): DiagramOrganization {
  return { id, name: id, groupIds: [], parentOrgId: parent, collapsed: false };
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

  it('failure: unknown expandedRootId throws', async () => {
    const orgs = [org('a')];
    await expect(computeOrgRowTreeLayout(orgs, 'missing')).rejects.toThrow(/unknown/i);
  });
});
