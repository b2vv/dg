import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram, type OrgHierarchyConfig } from './OrgHierarchyDiagram.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';
import type { PixiHost } from './render/PixiHost.js';
import type { DiagramData } from './data/types.js';
import type { ResolvedAnimate, TransitionFrame } from './render/transition/types.js';

function treeData(): DiagramData {
  return {
    organizations: [{ id: 'org', name: 'Org', groupIds: [], collapsed: false }],
    departments: [], groups: [], persons: [],
    positions: ['head', 'child', 'leaf'].map((id) => ({
      id, title: id, organizationId: 'org', groupIds: [], status: 'vacant',
      isTemporary: false, expanded: false, isHead: id === 'head',
    })),
    reportLines: [
      { fromId: 'head', toId: 'child', kind: 'admin' },
      { fromId: 'child', toId: 'leaf', kind: 'admin' },
    ],
  };
}

const mediaTemplate = window.matchMedia('screen');
beforeEach(() => {
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...mediaTemplate, matches: false });
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  rstest.restoreAllMocks();
});

// T-E owns this boundary; T-C's implementation may land independently.
function transitionSeam() {
  let frame: TransitionFrame | null = new Map();
  const methods = {
    configureTransition: rstest.fn((_resolved: ResolvedAnimate | null) => {}),
    startTransition: rstest.fn(), abortTransition: rstest.fn(), settleNow: rstest.fn(),
    getTransitionFrame: rstest.fn(() => frame),
  };
  for (const [name, method] of Object.entries(methods)) {
    const previous = Object.getOwnPropertyDescriptor(DiagramRenderer.prototype, name);
    Object.defineProperty(DiagramRenderer.prototype, name, { configurable: true, writable: true, value: method });
    cleanups.push(() => {
      if (previous) Object.defineProperty(DiagramRenderer.prototype, name, previous);
      else Reflect.deleteProperty(DiagramRenderer.prototype, name);
    });
  }
  return { ...methods, finish: () => { frame = null; } };
}

async function mount(config: Partial<OrgHierarchyConfig> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: treeData(), useWorker: false, motionBlur: false, staffCurrentOrgId: 'org', ...config,
  });
  // Explicit renderer seam authorized by T-E brief; avoid exposing it in the SDK API.
  const host = (diagram as unknown as { host: PixiHost }).host;
  cleanups.push(() => { diagram.destroy(); container.remove(); });
  return { diagram, host };
}

describe('facade transitions', () => {
  it('success: the first render and LOD crossings supply snap', async () => {
    transitionSeam();
    const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
    const { diagram } = await mount({ animate: true });
    expect(render.mock.calls[0]?.[4]).toMatchObject({ transition: 'snap' });
    diagram.setViewport({ x: 0, y: 0, scale: 0.01 });
    await diagram.setStyles(undefined);
    expect(render.mock.calls.at(-1)?.[4]).toMatchObject({ transition: 'snap' });
  });

  it('success: settling publishes structural after per-frame transition delivery', async () => {
    const seam = transitionSeam();
    const { diagram, host } = await mount({ animate: true });
    const listener = rstest.fn();
    diagram.subscribePromoteSync(listener);
    const renderer = host.renderer as DiagramRenderer & { onTransitionFrame?: () => void };
    renderer.onTransitionFrame?.();
    seam.finish();
    renderer.onTransitionFrame?.();
    expect(listener.mock.calls).toEqual([['transition'], ['structural']]);
  });

  it('success: a snap caller cannot erase queued animate intent and the next pass resets it', async () => {
    transitionSeam();
    const { diagram, host } = await mount({ animate: true });
    const original = host.renderer.render.bind(host.renderer);
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const render = rstest.spyOn(host.renderer, 'render').mockImplementationOnce(async (...args) => {
      await gate;
      await original(...args);
    });
    rstest.spyOn(host, 'panTo').mockImplementation(() => {});
    const first = diagram.setTheme('dark');
    const toggle = diagram.togglePositionExpand('head');
    const styles = diagram.setStyles(undefined);
    release();
    await Promise.all([first, toggle, styles]);
    expect(render.mock.calls.map((args) => args[4])).toMatchObject([
      { transition: 'snap' }, { transition: 'animate' },
    ]);
    await diagram.setTheme('light');
    expect(render.mock.calls.at(-1)?.[4]).toMatchObject({ transition: 'snap' });
  });

  it('success: structural operations animate, theme and style passes snap', async () => {
    const seam = transitionSeam();
    const { diagram, host } = await mount({ animate: true });
    const render = rstest.spyOn(host.renderer, 'render');
    rstest.spyOn(host, 'panTo').mockImplementation(() => {});
    const operations = [
      () => diagram.togglePositionExpand('head'),
      () => diagram.expandToDepth({ depth: 2 }),
      () => diagram.collapsePositionSubtree('head'),
      () => diagram.revealPath('leaf', { select: false }),
      () => diagram.setData(treeData()),
      () => diagram.reparentPosition('leaf', 'head'),
    ];
    for (const operation of operations) {
      render.mockClear();
      seam.startTransition.mockClear();
      await operation();
      expect(render.mock.calls.at(-1)?.[4]).toMatchObject({ transition: 'animate' });
      expect(seam.startTransition).toHaveBeenCalledTimes(1);
    }
    for (const operation of [() => diagram.setTheme('dark'), () => diagram.setStyles(undefined)]) {
      await operation();
      expect(render.mock.calls.at(-1)?.[4]).toMatchObject({ transition: 'snap' });
    }
  });

  it('failure: a refused pass aborts and does not start the transition', async () => {
    const seam = transitionSeam();
    const { diagram, host } = await mount({ animate: true });
    seam.startTransition.mockClear();
    rstest.spyOn(host.renderer, 'render').mockRejectedValueOnce(new Error('refused frame'));
    await expect(diagram.togglePositionExpand('head')).rejects.toThrow('refused frame');
    expect(seam.abortTransition).toHaveBeenCalledTimes(1);
    expect(seam.startTransition).not.toHaveBeenCalled();
    expect(diagram.getStaffExpandedPositionIds()).not.toContain('head');
  });

  it('success: omitted animate keeps transition lifecycle inactive', async () => {
    const seam = transitionSeam();
    const { diagram } = await mount();
    await diagram.setData(treeData());
    expect(seam.configureTransition).toHaveBeenCalledWith(null);
    expect(seam.startTransition).not.toHaveBeenCalled();
    expect(seam.abortTransition).not.toHaveBeenCalled();
    expect(diagram.getTransitionFrame()).toBeNull();
  });

  it('success: export settles before accessing the raster scene', async () => {
    const seam = transitionSeam();
    const { diagram, host } = await mount({ animate: true });
    const order: string[] = [];
    seam.settleNow.mockImplementation(() => { order.push('settle'); });
    rstest.spyOn(host, 'getApplication').mockImplementation(() => { order.push('raster'); throw new Error('raster refused'); });
    await expect(diagram.export({ format: 'png' })).rejects.toThrow('raster refused');
    expect(order).toEqual(['settle', 'raster']);
  });

  it('success: destroy disables the controller before destroying the host', async () => {
    const seam = transitionSeam();
    const { diagram, host } = await mount({ animate: true });
    seam.configureTransition.mockClear();
    const destroy = rstest.spyOn(host, 'destroy');
    diagram.destroy();
    expect(seam.configureTransition).toHaveBeenCalledWith(null);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(diagram.getTransitionFrame()).toBeNull();
  });

  it('success: refit with animation never prepares target-frame overlay cards', async () => {
    const seam = transitionSeam();
    const { diagram, host } = await mount({ animate: true, staffRefitOnToggle: true });
    const target = { x: 10, y: 20, scale: 0.8 };
    const fit = rstest.spyOn(diagram, 'fitStaffChrome').mockImplementation(() => { host.setViewport(target); return target; });
    const camera = rstest.spyOn(host, 'animateViewport');
    const reasons: string[] = [];
    diagram.subscribePromoteSync((reason) => { reasons.push(reason); });
    await diagram.togglePositionExpand('head');
    expect(fit).not.toHaveBeenCalled();
    seam.finish();
    const renderer = host.renderer as DiagramRenderer & { onTransitionFrame?: () => void };
    renderer.onTransitionFrame?.();
    expect(fit).toHaveBeenCalledTimes(1);
    expect(reasons).not.toContain('prepare-camera');
    expect(camera).not.toHaveBeenCalled();
    expect(diagram.getViewport()).toEqual(target);
  });

  it('success: backdrop teardown settles and redraws Pixi chrome', async () => {
    const seam = transitionSeam();
    const { diagram, host } = await mount({ animate: true, render: { staffReactChrome: true } });
    const render = rstest.spyOn(host.renderer, 'render');
    await diagram.setStaffReactChromeMounted(false);
    expect(seam.settleNow).toHaveBeenCalledTimes(1);
    expect(render.mock.calls.at(-1)?.[3]).toMatchObject({ staffReactChrome: false });
    expect(render.mock.calls.at(-1)?.[4]).toMatchObject({ transition: 'snap' });
  });

  it('success: resolves opt-in physics once at creation', async () => {
    const seam = transitionSeam();
    const media = rstest.spyOn(window, 'matchMedia');
    const { diagram } = await mount({ animate: { stiffness: 120, damping: 15, mass: 2 } });
    expect(seam.configureTransition).toHaveBeenCalledWith({ stiffness: 120, damping: 15, mass: 2, fadeMs: 200 });
    const reads = media.mock.calls.filter(([query]) => query.includes('reduced-motion')).length;
    expect(reads).toBe(1);
    await diagram.setData(treeData());
    expect(media.mock.calls.filter(([query]) => query.includes('reduced-motion'))).toHaveLength(reads);
  });

  it('failure: reduced motion disables an opted-in transition', async () => {
    const seam = transitionSeam();
    rstest.spyOn(window, 'matchMedia').mockImplementation((query) => ({ ...mediaTemplate, matches: query.includes('reduced-motion') }));
    await mount({ animate: true });
    expect(seam.configureTransition).toHaveBeenCalledWith(null);
  });

  it('failure: one throwing transition subscriber cannot block the next subscriber or frame', async () => {
    transitionSeam();
    const { diagram, host } = await mount({ animate: true });
    const warn = rstest.spyOn(console, 'warn').mockImplementation(() => {});
    const next = rstest.fn();
    diagram.subscribePromoteSync((reason) => { if (reason === 'transition') throw new Error('host'); });
    diagram.subscribePromoteSync(next);
    // The renderer callback is the fixed wave-2 seam, even before T-C adds its type.
    const renderer = host.renderer as DiagramRenderer & { onTransitionFrame?: () => void };
    renderer.onTransitionFrame?.();
    renderer.onTransitionFrame?.();
    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenLastCalledWith('transition');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
