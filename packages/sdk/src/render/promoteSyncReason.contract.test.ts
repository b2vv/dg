import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { PromoteSyncReason } from './promoteMath.js';

// The promote overlay re-syncs for two very different reasons, and must be told
// which: a camera move rides a CSS catch-up and defers its rebuild (settle),
// while a structural change (a render — LOD transition, setData, expand) needs
// the HTML rebuilt NOW, since Pixi has already moved/hidden its nodes. These
// tests pin which reason each source emits. (T-promote-overlay-structural-sync)

function data() {
  return {
    organizations: [
      { id: 'org-1', name: 'Root', groupIds: [], collapsed: true, matrixOrder: 0 },
      { id: 'org-2', name: 'Child', parentOrgId: 'org-1', groupIds: [], collapsed: true, matrixOrder: 1 },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [] as const,
  };
}

const frame = () =>
  new Promise((r) => {
    requestAnimationFrame(() => r(null));
  });

async function mount(reasons: PromoteSyncReason[]) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: data(),
    useWorker: false,
  });
  diagram.subscribePromoteSync((reason) => reasons.push(reason));
  return { container, diagram };
}

describe('promote sync reason (camera vs structural)', () => {
  it('camera: a pan (same scale, no LOD change) emits "camera"', async () => {
    const reasons: PromoteSyncReason[] = [];
    const { container, diagram } = await mount(reasons);
    reasons.length = 0;

    // Pan only (x/y), scale untouched → no LOD transition, no render.
    diagram.setViewport({ x: 90, y: -30 });
    await frame();

    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons).toContain('camera');
    expect(reasons).not.toContain('structural');

    diagram.destroy();
    container.remove();
  });

  it('structural: a re-render via setData emits "structural" (same afterRender path as expand)', async () => {
    const reasons: PromoteSyncReason[] = [];
    const { container, diagram } = await mount(reasons);
    reasons.length = 0;

    await diagram.setData(data());
    await frame();

    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons).toContain('structural');
    expect(reasons).not.toContain('camera');

    diagram.destroy();
    container.remove();
  });

  it('structural: zooming across the far boundary emits "structural" (LOD re-render, AC1)', async () => {
    const reasons: PromoteSyncReason[] = [];
    const { container, diagram } = await mount(reasons);

    // Sit clearly in the detail band first, then cross into far. The LOD change
    // re-renders (Pixi swaps cards for far marks), and THAT render's afterRender
    // must emit 'structural' so the overlay rebuilds in the same frame rather
    // than leaving an empty far frame for settleMs. (far boundary = farMax 0.45)
    diagram.setViewport({ scale: 1 });
    await frame();
    reasons.length = 0;

    diagram.setViewport({ scale: 0.36 }); // < 0.45 → far
    await frame();
    await frame();

    expect(reasons).toContain('structural');

    diagram.destroy();
    container.remove();
  });
});
