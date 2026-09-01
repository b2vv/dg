import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { ViewportTransform } from './Viewport.js';

interface Seen {
  t: ViewportTransform;
  settled: boolean;
  reason: 'camera' | 'resize';
}

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
const quiet = (ms: number) => new Promise((r) => { setTimeout(r, ms); });

async function mount(seen: Seen[]) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: data(),
    useWorker: false,
    viewportSettleMs: 20,
    callbacks: {
      onViewportChange: (t, meta) => seen.push({ t, settled: meta.settled, reason: meta.reason }),
    },
  });
  return { container, diagram };
}

describe('onViewportChange (T88.2)', () => {
  it('success: a camera move reaches the host with the transform that caused it', async () => {
    const seen: Seen[] = [];
    const { container, diagram } = await mount(seen);
    seen.length = 0;

    diagram.setViewport({ x: 120, y: -40, scale: 1.5 });
    await frame();

    expect(seen.length).toBeGreaterThan(0);
    const last = seen[seen.length - 1]!;
    expect(last.reason).toBe('camera');
    expect(last.t).toEqual({ x: 120, y: -40, scale: 1.5 });

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: a burst of moves in one frame arrives as one call', async () => {
    // The window arithmetic runs on every event, so an un-coalesced stream would
    // put it on every pointermove. PixiHost coalesces its *paint*, not the
    // handler — measured, not assumed: PixiHost.ts:164-170 calls handler(t)
    // straight through.
    const seen: Seen[] = [];
    const { container, diagram } = await mount(seen);
    seen.length = 0;

    for (let i = 0; i < 25; i += 1) diagram.setViewport({ x: i * 3, y: 0, scale: 1 });
    await frame();

    const moving = seen.filter((s) => !s.settled);
    expect(moving).toHaveLength(1);
    expect(moving[0]!.t.x).toBe(72); // the last one wins, not the first

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: the camera stopping is reported once, as settled', async () => {
    const seen: Seen[] = [];
    const { container, diagram } = await mount(seen);
    seen.length = 0;

    diagram.setViewport({ x: 10, y: 10, scale: 1 });
    await frame();
    await quiet(60);

    const settled = seen.filter((s) => s.settled);
    expect(settled).toHaveLength(1);
    expect(settled[0]!.t.x).toBe(10);

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('success: a resize is reported as its own reason, with the camera unmoved', async () => {
    // A resize changes how much of the scene fits without moving the camera, so
    // a host that only listens for camera moves would leave a bare strip along
    // the new edge and never fill it.
    const seen: Seen[] = [];
    const { container, diagram } = await mount(seen);
    const before = diagram.getViewport();
    seen.length = 0;

    // PixiHost has no public resize — the real trigger is its ResizeObserver,
    // which jsdom does not run. Poking the same hook it calls keeps the trigger
    // honest; the assertion below is still on the public callback.
    const host = (diagram as unknown as { host: { onResize: (() => void) | null } }).host;
    host.onResize?.();
    await frame();

    const resizes = seen.filter((s) => s.reason === 'resize');
    expect(resizes.length).toBeGreaterThan(0);
    expect(resizes[0]!.t).toEqual(before);

    diagram.destroy();
    document.body.removeChild(container);
  });

  it('failure: nothing is reported after destroy, and no settle fires later', async () => {
    const seen: Seen[] = [];
    const { container, diagram } = await mount(seen);

    diagram.setViewport({ x: 5, y: 5, scale: 1 });
    diagram.destroy();
    seen.length = 0;
    await frame();
    await quiet(60);

    expect(seen).toEqual([]);
    document.body.removeChild(container);
  });
});
