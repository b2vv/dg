import { describe, expect, it } from '@rstest/core';
import { computeOrgRowTreeLayout } from './rowTreeLayout.js';
import type { DiagramOrganization } from '../data/types.js';

function org(
  id: string,
  parentOrgId: string | undefined,
  collapsed?: boolean,
): DiagramOrganization {
  return {
    id,
    name: id,
    groupIds: [],
    parentOrgId,
    collapsed,
  };
}

describe('computeOrgRowTreeLayout collapse visibility', () => {
  const tree = [
    org('root', undefined, false),
    org('mid', 'root', false),
    org('a', 'mid', false),
    org('b', 'mid', false),
  ];

  it('success: collapsed node hides descendant orgs from layout', async () => {
    const full = await computeOrgRowTreeLayout(tree, 'root');
    expect(full.nodes.map((n) => n.orgId).sort()).toEqual(['a', 'b', 'mid', 'root']);

    const collapsedMid = tree.map((o) => (o.id === 'mid' ? { ...o, collapsed: true } : o));
    const pruned = await computeOrgRowTreeLayout(collapsedMid, 'root');
    expect(pruned.nodes.map((n) => n.orgId).sort()).toEqual(['mid', 'root']);
  });
});
