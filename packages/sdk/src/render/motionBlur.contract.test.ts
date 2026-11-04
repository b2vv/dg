import { afterEach, describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';

// Motion blur is applied to the host container (common parent of canvas + the
// HTML overlay) while the camera moves fast, and cleared when it settles. These
// drive the real diagram and read container.style.filter — the observable seam.

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

const sleep = (ms: number) => new Promise((r) => { setTimeout(r, ms); });

async function mount(motionBlur: boolean | undefined, settleMs = 20) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: data(),
    useWorker: false,
    viewportSettleMs: settleMs,
    // Omit the key entirely when undefined, so the SDK default applies.
    ...(motionBlur === undefined ? {} : { motionBlur }),
  });
  return { container, diagram };
}

async function fastPan(diagram: OrgHierarchyDiagram): Promise<void> {
  diagram.setViewport({ x: 0, y: 0 }); // baseline frame
  await sleep(8);
  diagram.setViewport({ x: 600, y: 0 }); // ~75 px/ms → past the cap
}

describe('motion blur on pan', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fast pan sets a blur filter on the container', async () => {
    const { container, diagram } = await mount(true);
    await fastPan(diagram);
    expect(container.style.filter).toMatch(/^blur\([\d.]+px\)$/);
    diagram.destroy();
  });

  it('filter is cleared once the camera settles', async () => {
    const { container, diagram } = await mount(true, 20);
    await fastPan(diagram);
    expect(container.style.filter).toMatch(/blur/);
    await sleep(60); // past viewportSettleMs
    expect(container.style.filter).toBe('');
    diagram.destroy();
  });

  it('on by default (unset): a fast pan blurs', async () => {
    const { container, diagram } = await mount(undefined);
    await fastPan(diagram);
    expect(container.style.filter).toMatch(/blur/);
    diagram.destroy();
  });

  it('explicit false disables: filter is never touched', async () => {
    const { container, diagram } = await mount(false);
    await fastPan(diagram);
    expect(container.style.filter).toBe('');
    diagram.destroy();
  });

  it('slow pan stays sharp (dead zone): no filter', async () => {
    const { container, diagram } = await mount(true);
    diagram.setViewport({ x: 0, y: 0 });
    await sleep(40);
    diagram.setViewport({ x: 3, y: 0 }); // 3px / 40ms = 0.075 px/ms << minSpeed
    expect(container.style.filter).toBe('');
    diagram.destroy();
  });

  it('a resize does not blur (only the camera path does)', async () => {
    const { container, diagram } = await mount(true);
    const host = (diagram as unknown as { host: { onResize: (() => void) | null } }).host;
    host.onResize?.();
    expect(container.style.filter).toBe('');
    diagram.destroy();
  });

  it('destroy clears the filter', async () => {
    const { container, diagram } = await mount(true);
    await fastPan(diagram);
    expect(container.style.filter).toMatch(/blur/);
    diagram.destroy();
    expect(container.style.filter).toBe('');
  });

  it('prefers-reduced-motion: blur never runs', async () => {
    const orig = window.matchMedia;
    window.matchMedia = (q: string) => ({
      matches: /prefers-reduced-motion/.test(q),
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() { return false; },
    });
    try {
      const { container, diagram } = await mount(true);
      await fastPan(diagram);
      expect(container.style.filter).toBe('');
      diagram.destroy();
    } finally {
      window.matchMedia = orig;
    }
  });
});
