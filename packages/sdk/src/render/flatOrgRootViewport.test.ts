import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { PixiHost } from './PixiHost.js';

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

type DiagramInternals = { host: PixiHost | null };

function hostOf(diagram: OrgHierarchyDiagram): PixiHost {
  const host = (diagram as unknown as DiagramInternals).host;
  if (!host) throw new Error('expected host');
  return host;
}

function worldToScreen(
  worldX: number,
  worldY: number,
  vp: { x: number; y: number; scale: number },
): { x: number; y: number } {
  return {
    x: worldX * vp.scale + vp.x,
    y: worldY * vp.scale + vp.y,
  };
}

function boxCenterVisible(
  box: { x: number; y: number; width: number; height: number },
  vp: { x: number; y: number; scale: number },
  screenW: number,
  screenH: number,
): boolean {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const s = worldToScreen(cx, cy, vp);
  return s.x >= 0 && s.x <= screenW && s.y >= 0 && s.y <= screenH;
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
    expect(diagram.fitView(28, { animate: false })).toBe(true);

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: expandOrg frames child org into viewport (T53)', async () => {
    const { container, diagram } = await mountFlatOrgs();
    await diagram.expandOrg('org-1');
    expect(diagram.getOrgMode()).toBe('row-tree');

    const childBox = hostOf(diagram).renderer.getNodeBox('org-2');
    expect(childBox).toBeTruthy();

    const vp = diagram.getViewport();
    expect(boxCenterVisible(childBox!, vp, 800, 600)).toBe(true);

    diagram.destroy();
    document.body.removeChild(container);
  });
});
