import { describe, expect, it } from 'vitest';
import { expandOrg, detectOrgMode } from './orgMode.js';
import { computeOrgLayout } from './rowTreeLayout.js';
import type { DiagramOrganization } from '../data/types.js';

function buildFlatOrgs(count = 24): DiagramOrganization[] {
  return Array.from({ length: count }, (_, i) => {
    let parentOrgId: string | undefined;
    if (i === 0) parentOrgId = undefined;
    else if (i <= 4) parentOrgId = 'org-1';
    else parentOrgId = `org-${1 + Math.ceil((i - 4) / 4)}`;
    if (parentOrgId) {
      const pIdx = Number(parentOrgId.replace('org-', '')) - 1;
      if (pIdx < 0 || pIdx >= i) parentOrgId = 'org-1';
    }
    return {
      id: `org-${i + 1}`,
      name: `Organization ${i + 1}`,
      parentOrgId,
      groupIds: [],
      collapsed: true,
      matrixOrder: i,
    };
  });
}

describe('flat org root expand layout', () => {
  it('success: row-tree after org-1 expand still has nodes', async () => {
    const orgs = buildFlatOrgs();
    const matrix = await computeOrgLayout(orgs, []);
    expect(matrix.mode).toBe('matrix');
    expect(matrix.nodes.length).toBe(24);

    const expanded = expandOrg(orgs, 'org-1');
    expect(detectOrgMode(expanded)).toBe('row-tree');
    const tree = await computeOrgLayout(expanded, []);
    expect(tree.mode).toBe('row-tree');
    expect(tree.nodes.length).toBeGreaterThan(0);
    expect(tree.width).toBeGreaterThan(0);
    expect(tree.height).toBeGreaterThan(0);
    // Regression guard: root expand must not drop the whole subtree from layout output.
    expect(tree.nodes.length).toBeGreaterThanOrEqual(5);
  });
});
