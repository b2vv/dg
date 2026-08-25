import { describe, expect, it } from 'vitest';
import { expandOrg, detectOrgMode } from './orgMode.js';
import { revealOrgPath } from '../interaction/revealPath.js';
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

  /**
   * T77-M06: expanding a child must not root the tree at that child. The whole
   * ancestor chain and every sibling branch stay in the layout.
   */
  it('success: expanding a non-root org keeps its ancestors and their siblings', async () => {
    const orgs = buildFlatOrgs();
    const child = orgs.find((o) => o.parentOrgId && o.parentOrgId !== 'org-1');
    expect(child, 'fixture needs an org two levels down').toBeTruthy();
    const parentId = child!.parentOrgId!;

    const revealed = revealOrgPath(orgs, child!.id);
    const tree = await computeOrgLayout(revealed, []);
    const ids = new Set(tree.nodes.map((n) => n.orgId));

    // The path up to the root is open…
    expect(ids.has(child!.id)).toBe(true);
    expect(ids.has(parentId)).toBe(true);
    expect(ids.has('org-1')).toBe(true);

    // …and the branches beside it are still laid out, not pruned away.
    const siblingsOfParent = orgs.filter(
      (o) => o.parentOrgId === 'org-1' && o.id !== parentId,
    );
    expect(siblingsOfParent.length).toBeGreaterThan(0);
    for (const sibling of siblingsOfParent) {
      expect(ids.has(sibling.id), `sibling ${sibling.id} dropped`).toBe(true);
    }
  });
});