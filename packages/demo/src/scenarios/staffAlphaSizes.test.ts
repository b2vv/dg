import { describe, expect, it } from '@rstest/core';
import {
  computeStaffLiveGeometry,
  defaultRenderConfig,
  emptyDiagramData,
  resolveNodeTheme,
  resolveTheme,
  type DiagramData,
} from '@org-hierarchy/sdk';
import { buildTabConfig, type TabConfigDeps } from '../app/tabConfigs.js';
import { buildScaleStaffWindow, STAFF_SCALE_DEFAULT_FOCUS } from './scaleStaff.js';

/**
 * Б1 (2026-11-02): розмір картки на шляху alpha — **на картку**, з `position.width/height`.
 * Раніше розкладка брала розмір першої посади організації й ставила його всім, тож
 * калібровані хостом висоти (ADR-0079 хоста) не мали ефекту.
 */
const deps: TabConfigDeps = {
  theme: 'light',
  contourControls: { paddingCells: 1, smoothIterations: 2 },
  flatOrgsData: emptyDiagramData(),
  scaleOrgsWindow: () => { throw new Error('Not a staff scene'); },
  scaleStaffWindow: () => buildScaleStaffWindow({ focusIndex: STAFF_SCALE_DEFAULT_FOCUS }),
};

const cfg = buildTabConfig('staff-alpha', deps);
const orgId = cfg.staffCurrentOrgId!;

async function geometry(data: DiagramData) {
  const resolvedTheme = resolveTheme(cfg.theme ?? 'light');
  return computeStaffLiveGeometry({
    data,
    currentOrgId: orgId,
    theme: resolveNodeTheme(resolvedTheme, cfg.styles),
    resolvedTheme,
    config: { ...defaultRenderConfig, ...cfg.render },
    staff: cfg.staffLayout ? { layout: cfg.staffLayout } : undefined,
    lod: 'near',
  });
}

function withHeight(data: DiagramData, id: string, height: number): DiagramData {
  return {
    ...data,
    positions: data.positions.map((p) => (p.id === id ? { ...p, width: p.width ?? 300, height } : p)),
  };
}

const base = cfg.data as unknown as DiagramData;
const inOrg = base.positions.filter((p) => p.organizationId === orgId);

describe('staff-alpha: card size per position', () => {
  it('a later position keeps its own height, and the layout makes room for it', async () => {
    const target = inOrg[3]!;
    const before = await geometry(base);
    const after = await geometry(withHeight(base, target.id, 260));
    const node = (g: typeof before, id: string) => g.canvas.positionNodes.find((n) => n.id === id)!;

    expect(node(after, target.id).height).toBe(260);
    const moved = inOrg.filter((p) => node(after, p.id).y !== node(before, p.id).y);
    expect(moved.length, 'some card below the taller one moved down').toBeGreaterThan(0);
  });

  it('the first position no longer sets the size of every card', async () => {
    const first = inOrg[0]!;
    const after = await geometry(withHeight(base, first.id, 200));
    const others = after.canvas.positionNodes.filter((n) => n.id !== first.id);
    expect(others.every((n) => n.height !== 200)).toBe(true);
  });
});
