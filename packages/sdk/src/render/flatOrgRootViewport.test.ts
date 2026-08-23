import { describe, expect, it } from 'vitest';
import { OrgHierarchyDiagram } from '../index.js';

function buildFlatOrgs(count = 24) {
  const organizations = Array.from({ length: count }, (_, i) => {
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
      groupIds: [] as string[],
      collapsed: true,
      matrixOrder: i,
    };
  });
  return {
    organizations,
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [] as const,
  };
}

async function mountFlatOrgs() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: buildFlatOrgs(),
    useWorker: false,
  });
  diagram.fitView(28, { animate: false });
  return { container, diagram };
}

describe('flat org root expand viewport', () => {
  it('success: fitView still succeeds after expandOrg on root', async () => {
    const { container, diagram } = await mountFlatOrgs();
    expect(diagram.fitView(28, { animate: false })).toBe(true);

    await diagram.expandOrg('org-1');
    expect(diagram.getOrgMode()).toBe('row-tree');
    // expandOrg pans to org (T53) — refit should still succeed.
    expect(diagram.fitView(28, { animate: false })).toBe(true);

    diagram.destroy();
    document.body.removeChild(container);
  });
});
