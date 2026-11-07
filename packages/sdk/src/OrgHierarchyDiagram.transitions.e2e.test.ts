import { afterEach, expect, it, rstest } from '@rstest/core';
import { act } from 'react';
import { OrgHierarchyDiagram } from './OrgHierarchyDiagram.js';
import type { DiagramData } from './data/types.js';
import type { PixiHost } from './render/PixiHost.js';
import type { SceneRegistry } from './render/SceneRegistry.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';
import { defaultNodeTheme, defaultRenderConfig } from './render/types.js';
import { createReactPromoteOverlay, DefaultPromoteCard } from './react/createReactPromoteOverlay.js';

// Adapted from the facade transition fixture: the sibling must survive collapse
// so interpolation is observed on a real card, rather than only on exit ghosts.
function treeData(): DiagramData {
  return {
    organizations: [{ id: 'org', name: 'Org', groupIds: [], collapsed: false }],
    departments: [], groups: [], persons: [],
    positions: ['root', 'head', 'sibling', 'child', 'leaf'].map((id) => ({
      id, title: id, organizationId: 'org', groupIds: [], status: 'vacant',
      isTemporary: false, expanded: id === 'root' || id === 'head', isHead: id === 'root',
    })),
    reportLines: [
      { fromId: 'root', toId: 'head', kind: 'admin' },
      { fromId: 'root', toId: 'sibling', kind: 'admin' },
      { fromId: 'head', toId: 'child', kind: 'admin' },
      { fromId: 'head', toId: 'leaf', kind: 'admin' },
    ],
  };
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  rstest.restoreAllMocks();
});

it('carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle', async () => {
  let now = 0;
  let serial = 0;
  const pending = new Map<number, FrameRequestCallback>();
  rstest.spyOn(performance, 'now').mockImplementation(() => now);
  const request = rstest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    pending.set(++serial, callback);
    return serial;
  });
  rstest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); });
  const media = window.matchMedia('screen');
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: false });
  const step = (ms = 17) => act(() => {
    now += ms;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(now));
  });

  // Same real mount as OrgHierarchyDiagram.transitions.test.ts, without its seam mocks.
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const diagram = await OrgHierarchyDiagram.create(mount, {
    data: treeData(), useWorker: false, motionBlur: false, staffCurrentOrgId: 'org',
    animate: true, theme: 'light', staffRefitOnToggle: true,
  });
  cleanups.push(() => { diagram.destroy(); mount.remove(); });
  // Read-only observation of Pixi objects; no replacement of any production method.
  const host = (diagram as unknown as { host: PixiHost }).host;
  const scene = (host.renderer as unknown as { scene: SceneRegistry }).scene;
  const reasons: string[] = [];
  cleanups.push(diagram.subscribePromoteSync((reason) => { reasons.push(reason); }));
  const transitionCount = () => reasons.filter((reason) => reason === 'transition').length;
  expect(diagram.getTransitionFrame()).toBeNull();
  for (const view of host.renderer.layers.persons.children) expect(view.alpha).toBe(1);
  for (let frame = 0; frame < 60 && pending.size > 0; frame++) {
    step();
    expect(diagram.getTransitionFrame()).toBeNull();
  }
  expect(transitionCount()).toBe(0);
  request.mockClear();

  diagram.setViewport({ x: 0, y: 0, scale: 1 });
  let disposeOverlay = () => {};
  act(() => {
    const overlay = createReactPromoteOverlay({ diagram, mount, component: DefaultPromoteCard, mode: 'near-visible' });
    disposeOverlay = overlay.dispose;
  });
  cleanups.push(() => act(disposeOverlay));
  const start = host.renderer.getNodeBox('sibling');
  expect(start).toBeDefined();
  if (!start) throw new Error('Missing fixture sibling');
  await act(async () => { await diagram.togglePositionExpand('head'); });
  const target = host.renderer.getNodeBox('sibling');
  const view = scene.getView('position', 'sibling');
  expect(target).toBeDefined();
  expect(view).toBeDefined();
  if (!target || !view) throw new Error('Missing surviving sibling');
  const axis = target.x === start.x ? 'y' : 'x';
  expect(target[axis]).not.toBe(start[axis]);
  expect(view[axis]).toBe(start[axis]);
  expect(request).toHaveBeenCalled();
  expect(diagram.getTransitionFrame()).not.toBeNull();
  const slot = mount.querySelector<HTMLElement>('[data-promote-slot="position:sibling"]');
  expect(slot).not.toBeNull();
  const beforeTransform = slot?.style.transform;
  step(34);
  expect(view[axis]).toBeGreaterThan(Math.min(start[axis], target[axis]));
  expect(view[axis]).toBeLessThan(Math.max(start[axis], target[axis]));
  expect(slot?.style.transform).not.toBe(beforeTransform);
  expect(reasons).toContain('transition');
  step(750);
  expect(diagram.getTransitionFrame()).toBeNull();
  expect(reasons.at(-1)).toBe('structural');
  // Pixi's ambient event ticker may poll; D3 must publish no new frames.
  const settledTransitions = transitionCount();
  const settledPosition = { x: view.x, y: view.y };
  for (let frame = 0; frame < 5; frame++) {
    step(200);
    expect(diagram.getTransitionFrame()).toBeNull();
    expect(transitionCount()).toBe(settledTransitions);
    expect({ x: view.x, y: view.y }).toEqual(settledPosition);
  }

  // Existing renderer golden/opt-out pattern: render the identical final tree
  // with no controller, then compare actual Pixi positions by stable entity id.
  const reference = new DiagramRenderer();
  cleanups.push(() => reference.destroy());
  const finalData = treeData();
  finalData.positions = finalData.positions.map((position) => ({ ...position, expanded: position.id === 'root' }));
  await reference.render(finalData, defaultNodeTheme, 'light', defaultRenderConfig, {
    staff: { currentOrgId: 'org', layout: { expandedPositionIds: ['root'] } },
  });
  const expected = reference.listNodeBoxes().filter((box) => box.kind === 'position');
  expect(host.renderer.listNodeBoxes().filter((box) => box.kind === 'position').map((box) => box.id).sort())
    .toEqual(expected.map((box) => box.id).sort());
  for (const box of expected) {
    const actual = scene.getView('position', box.id.slice('position:'.length));
    expect(actual).toBeDefined();
    if (!actual) throw new Error(`Missing final card ${box.id}`);
    expect(Math.abs(actual.x - box.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(actual.y - box.y)).toBeLessThanOrEqual(0.5);
  }
  const beforeUnchanged = transitionCount();
  await act(async () => { await diagram.setData(finalData); });
  expect(diagram.getTransitionFrame()).toBeNull();
  expect(transitionCount()).toBe(beforeUnchanged);
  for (let frame = 0; frame < 5; frame++) {
    step(200);
    expect(diagram.getTransitionFrame()).toBeNull();
    expect(transitionCount()).toBe(beforeUnchanged);
    const unchangedView = scene.getView('position', 'sibling');
    expect(unchangedView).toBeDefined();
    expect({ x: unchangedView?.x, y: unchangedView?.y }).toEqual(settledPosition);
  }
});
