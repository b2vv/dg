import { describe, expect, it } from '@rstest/core';
import { DiagramRenderer } from './DiagramRenderer.js';
import { defaultNodeTheme, defaultRenderConfig } from './types.js';
import type { DiagramData } from '../data/types.js';

function staffData(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Org', role: 'current', groupIds: [], collapsed: false }],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'org1' }],
    persons: [
      { id: 'p1', fullName: 'A' },
      { id: 'p2', fullName: 'B' },
    ],
    positions: [
      { id: 'a', title: 'A', organizationId: 'org1', departmentId: 'IT', groupIds: [], personId: 'p1', status: 'filled', isTemporary: false, isHead: true },
      { id: 'b', title: 'B', organizationId: 'org1', departmentId: 'IT', groupIds: [], personId: 'p2', status: 'filled', isTemporary: false },
    ],
    reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
  } as unknown as DiagramData;
}

function orgOnlyData(): DiagramData {
  return {
    organizations: [{ id: 'org1', name: 'Org', groupIds: [], collapsed: false }],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
  } as unknown as DiagramData;
}

const reactChromeConfig = { ...defaultRenderConfig, staffReactChrome: true };

describe('getStaffChromeGeometry cache lifecycle (Б2 I1)', () => {
  it('null before the first render', () => {
    const renderer = new DiagramRenderer();
    expect(renderer.getStaffChromeGeometry()).toBeNull();
  });

  it('non-null after an alpha render with React chrome on', async () => {
    const renderer = new DiagramRenderer();
    await renderer.render(staffData(), defaultNodeTheme, 'light', reactChromeConfig, {
      staff: { currentOrgId: 'org1' },
    });
    const geom = renderer.getStaffChromeGeometry();
    expect(geom).not.toBeNull();
    expect(geom?.nodeBoxes).toBeDefined();
  });

  it('TRANSITION: alpha (non-null) → non-staff render → null (not stale)', async () => {
    const renderer = new DiagramRenderer();
    await renderer.render(staffData(), defaultNodeTheme, 'light', reactChromeConfig, {
      staff: { currentOrgId: 'org1' },
    });
    expect(renderer.getStaffChromeGeometry()).not.toBeNull();

    // Org-view (no staff positions): renderStaffCanvas is never entered, so a reset
    // placed inside it would leave the stale alpha box. Reset must live at the top
    // of render(), so the getter goes null here.
    await renderer.render(orgOnlyData(), defaultNodeTheme, 'light', reactChromeConfig, {});
    expect(renderer.getStaffChromeGeometry()).toBeNull();
  });

  it('TRANSITION: alpha (non-null) → React chrome OFF → null', async () => {
    const renderer = new DiagramRenderer();
    await renderer.render(staffData(), defaultNodeTheme, 'light', reactChromeConfig, {
      staff: { currentOrgId: 'org1' },
    });
    expect(renderer.getStaffChromeGeometry()).not.toBeNull();

    // Same staff data, but the host unmounted the backdrop (Pixi draws chrome):
    // the non-null branch is skipped, so the cache must fall back to null.
    await renderer.render(staffData(), defaultNodeTheme, 'light', defaultRenderConfig, {
      staff: { currentOrgId: 'org1' },
    });
    expect(renderer.getStaffChromeGeometry()).toBeNull();
  });
});
