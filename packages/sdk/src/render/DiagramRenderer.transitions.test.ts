import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { FederatedPointerEvent, EventBoundary } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { defaultNodeTheme, defaultRenderConfig } from './types.js';
import { resolveAnimate } from './transition/resolveAnimate.js';
import type { DiagramData } from '../data/types.js';

const renderers: DiagramRenderer[] = [];
function data(col = 0): DiagramData {
  return {
    organizations: [], departments: [], groups: [], persons: [], reportLines: [],
    positions: [{ id: 'a', title: 'A', organizationId: 'org', departmentId: undefined,
      groupIds: [], personId: undefined, status: 'vacant', isTemporary: false, gridCell: { col, row: 0 } }],
  };
}
function setup() {
  let now = 0;
  let serial = 0;
  const pending = new Map<number, FrameRequestCallback>();
  rstest.spyOn(performance, 'now').mockImplementation(() => now);
  const request = rstest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    pending.set(++serial, cb);
    return serial;
  });
  rstest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); });
  const renderer = new DiagramRenderer();
  renderers.push(renderer);
  renderer.configureTransition(resolveAnimate(true, false));
  const draw = (input = data(), transition: 'animate' | 'snap' = 'animate') =>
    renderer.render(input, defaultNodeTheme, 'light', defaultRenderConfig, { transition });
  const step = (ms = 17) => {
    now += ms;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((cb) => cb(now));
  };
  return { renderer, draw, pending, request, step };
}
afterEach(() => {
  renderers.splice(0).forEach((renderer) => renderer.destroy());
  rstest.restoreAllMocks();
});

describe('renderer transitions with the real controller', () => {
  it('prepares at the old position, starts only on confirmation, and settles with a null signal', async () => {
    const { renderer, draw, pending, step } = setup();
    await draw();
    renderer.startTransition();
    const oldX = renderer.layers.persons.children[0].x;
    expect(pending.size).toBe(0);
    await draw(data(2));
    const target = renderer.getNodeBox('a');
    expect(renderer.layers.persons.children[0].x).toBe(oldX);
    expect(target?.x).toBeGreaterThan(oldX);
    expect(pending.size).toBe(0);
    const signals: boolean[] = [];
    renderer.onTransitionFrame = () => { signals.push(renderer.getTransitionFrame() !== null); };
    renderer.startTransition();
    step();
    expect(renderer.layers.persons.children[0].x).toBeGreaterThan(oldX);
    step(750);
    expect(renderer.layers.persons.children[0].x).toBe(target?.x);
    expect(signals).toEqual([true, false]);
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(pending.size).toBe(0);
  });

  it('restores detached views, boxes and promote visibility after a refused render', async () => {
    const { renderer, draw, pending, step } = setup();
    await draw();
    renderer.startTransition();
    await draw(data(2));
    renderer.startTransition();
    step();
    const view = renderer.layers.persons.children[0];
    const x = view.x;
    const paint = rstest.fn();
    renderer.onNeedsPaint = paint;
    const bad = data(3);
    Object.defineProperty(bad.positions[0], 'gridCell', { get() { throw new Error('refused layout'); } });
    await expect(draw(bad)).rejects.toThrow('refused layout');
    renderer.abortTransition();
    expect(renderer.layers.persons.children[0]).toBe(view);
    expect(view.destroyed).toBe(false);
    expect(view.x).toBe(x);
    expect(renderer.getNodeBox('a')?.x).toBe(x);
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(pending.size).toBe(0);
    expect(paint).toHaveBeenCalledTimes(1);
  });
});


describe('renderer ghost lifecycle', () => {
  it('keeps a fading exit through another render and absorbs it when the key returns', async () => {
    const { renderer, draw, step, pending } = setup();
    await draw(); renderer.startTransition();
    const original = renderer.layers.persons.children[0];
    const empty = { ...data(), positions: [] };
    await draw(empty); renderer.startTransition();
    expect(original.destroyed).toBe(false);
    expect(original.alpha).toBe(1);
    step(50);
    const alpha = original.alpha;
    expect(alpha).toBeLessThan(1);
    expect(alpha).toBeGreaterThan(0);
    await draw(empty); renderer.startTransition();
    expect(original.destroyed).toBe(false);
    step(50);
    expect(original.alpha).toBeLessThan(alpha);
    await draw(); renderer.startTransition();
    expect(original.destroyed).toBe(true);
    expect(renderer.layers.persons.children).toHaveLength(1);
    renderer.settleNow();
    expect(renderer.layers.persons.children[0].alpha).toBe(1);
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(pending.size).toBe(0);
  });

  it('settles before drag reads the origin', async () => {
    const { renderer, draw, pending } = setup();
    await draw(); renderer.startTransition();
    await draw(data(2)); renderer.startTransition();
    const view = renderer.layers.persons.children[0];
    const target = renderer.getNodeBox('a');
    const event = new FederatedPointerEvent(new EventBoundary(renderer.layers.root));
    event.global.set(view.x, view.y);
    event.pointerId = 1;
    view.emit('pointerdown', event);
    expect(view.x).toBe(target?.x);
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(pending.size).toBe(0);
  });
});

function staff(col = 0): DiagramData {
  const base = data(col);
  return { ...base,
    organizations: [{ id: 'org', name: 'Org', role: 'current', groupIds: [] }],
    departments: [{ id: 'dept', name: 'Dept', organizationId: 'org' }],
    positions: [
      { ...base.positions[0], departmentId: 'dept' },
      { ...base.positions[0], id: 'b', departmentId: 'dept', gridCell: { col: col + 2, row: 1 } },
    ],
    reportLines: [{ fromId: 'a', toId: 'b', kind: 'dotted' }],
  };
}

describe('staff chrome staging', () => {
  it('hides React lines during motion and returns interpolated org chrome then exact target routes', async () => {
    const { renderer, step } = setup();
    const config = { ...defaultRenderConfig, staffReactChrome: true };
    const draw = (col: number) => renderer.render(staff(col), defaultNodeTheme, 'light', config, {
      transition: 'animate', staff: { currentOrgId: 'org' },
    });
    await draw(0); renderer.startTransition();
    const old = renderer.getStaffChromeGeometry();
    expect(old?.lines.length).toBeGreaterThan(0);
    await draw(3);
    expect(renderer.getStaffChromeGeometry()?.lines).toEqual([]);
    expect(renderer.getStaffChromeGeometry()?.org?.x).toBe(old?.org?.x);
    renderer.startTransition(); step();
    const during = renderer.getStaffChromeGeometry();
    expect(during?.org?.x).toBeGreaterThan(old?.org?.x ?? Infinity);
    renderer.settleNow();
    const settled = renderer.getStaffChromeGeometry();
    expect(settled?.lines.length).toBeGreaterThan(0);
    await renderer.render(staff(3), defaultNodeTheme, 'light', config, { staff: { currentOrgId: 'org' } });
    expect(renderer.getStaffChromeGeometry()).toEqual(settled);
  });

  it('keeps old Pixi lines fading, hides new lines until settle and destroys old lines', async () => {
    const { renderer, step } = setup();
    const draw = (col: number) => renderer.render(staff(col), defaultNodeTheme, 'light', defaultRenderConfig, {
      transition: 'animate', staff: { currentOrgId: 'org' },
    });
    await draw(0); renderer.startTransition();
    const old = renderer.layers.edges.children[0];
    await draw(3); renderer.startTransition();
    expect(old.destroyed).toBe(false);
    expect(renderer.layers.edges.alpha).toBe(0);
    step(50);
    expect(old.alpha).toBeGreaterThan(0);
    expect(old.alpha).toBeLessThan(1);
    renderer.settleNow();
    expect(old.destroyed).toBe(true);
    expect(renderer.layers.edges.alpha).toBe(1);
  });
});

describe('Pixi chrome and culling', () => {
  it('moves rectangular department chrome as frame boxes, including on far LOD', async () => {
    const { renderer, step } = setup();
    const config = { ...defaultRenderConfig, departmentStyle: 'card' as const, minContourMembers: 1 };
    const draw = (col: number) => renderer.render(staff(col), defaultNodeTheme, 'light', config, {
      transition: 'animate', lod: 'far', staff: { currentOrgId: 'org' },
    });
    await draw(0); renderer.startTransition();
    const oldX = renderer.layers.departments.children[0].getLocalBounds().x;
    await draw(3);
    expect(renderer.layers.departments.children[0].getLocalBounds().x).toBeCloseTo(oldX);
    renderer.startTransition(); step();
    expect(renderer.layers.departments.children[0].getLocalBounds().x).toBeGreaterThan(oldX);
    renderer.settleNow();
    const settled = renderer.layers.departments.children[0].getLocalBounds().x;
    await renderer.render(staff(3), defaultNodeTheme, 'light', config, { lod: 'far', staff: { currentOrgId: 'org' } });
    expect(renderer.layers.departments.children[0].getLocalBounds().x).toBeCloseTo(settled);
  });

  it('culls moving live cards against both endpoints and exit ghosts against their frame', async () => {
    const { renderer, draw } = setup();
    const many = (col: number) => ({ ...data(), positions: Array.from({ length: 300 }, (_, i) => ({
      ...data(col).positions[0], id: String(i), gridCell: { col, row: i * 2 },
    })) });
    await draw(many(0)); renderer.startTransition();
    await draw(many(100)); renderer.startTransition();
    renderer.cullToViewport({ x: 0, y: 0, scale: 1 }, { width: 800, height: 600 });
    expect(renderer.layers.persons.children[0].renderable).toBe(true);
    renderer.settleNow();
    await draw({ ...data(), positions: [] }); renderer.startTransition();
    renderer.cullToViewport({ x: 0, y: 0, scale: 1 }, { width: 800, height: 600 });
    expect(renderer.getCullStats().drawn).toBe(0);
    expect(renderer.getCullStats().culled).toBe(300);
  });
});


describe('snap and idle boundaries', () => {
  it('null controller preserves the recorded bare-grid positions and requests zero frames', async () => {
    const { renderer, draw, request } = setup();
    renderer.configureTransition(null);
    await draw(data(2)); renderer.startTransition();
    expect(renderer.listNodeBoxes()).toEqual([
      { id: 'position:a', kind: 'position', x: 282, y: 2, width: 136, height: 156 },
    ]);
    expect(renderer.layers.persons.children[0].x).toBe(282);
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('unchanged data, first render, empty scene and settled scene have zero idle work', async () => {
    const { renderer, draw, request, pending, step } = setup();
    await draw(); renderer.startTransition();
    await draw(); renderer.startTransition();
    expect(request).not.toHaveBeenCalled();
    await draw(data(2)); renderer.startTransition();
    step(750);
    const paint = rstest.fn(); renderer.onNeedsPaint = paint;
    request.mockClear(); step(1000);
    expect(request).not.toHaveBeenCalled();
    expect(paint).not.toHaveBeenCalled();
    expect(pending.size).toBe(0);
    await draw({ ...data(), positions: [] }); renderer.startTransition();
    step(750);
    await draw({ ...data(), positions: [] }); renderer.startTransition();
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(pending.size).toBe(0);
  });

  it('LOD change wins over animate, removes ghosts, then permits animation at the confirmed LOD', async () => {
    const { renderer, draw, pending } = setup();
    await draw(); renderer.startTransition();
    const old = renderer.layers.persons.children[0];
    await draw({ ...data(), positions: [] }); renderer.startTransition();
    await renderer.render(data(3), defaultNodeTheme, 'light', defaultRenderConfig, { lod: 'far', transition: 'animate' });
    renderer.startTransition();
    expect(old.destroyed).toBe(true);
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(pending.size).toBe(0);
    await renderer.render(data(4), defaultNodeTheme, 'light', defaultRenderConfig, { lod: 'far', transition: 'animate' });
    renderer.startTransition();
    expect(renderer.getTransitionFrame()).not.toBeNull();
    expect(pending.size).toBe(1);
    await renderer.render(data(5), defaultNodeTheme, 'light', defaultRenderConfig, { lod: 'near', transition: 'snap' });
    renderer.startTransition();
    expect(pending.size).toBe(0);
    await draw(data(6)); renderer.startTransition();
    expect(pending.size).toBe(1);
  });

  it('snap during exit removes every ghost and returns lines immediately', async () => {
    const { renderer, draw, pending } = setup();
    await draw(); renderer.startTransition();
    const old = renderer.layers.persons.children[0];
    await draw({ ...data(), positions: [] }); renderer.startTransition();
    await draw(data(2), 'snap'); renderer.startTransition();
    expect(old.destroyed).toBe(true);
    expect(renderer.layers.edges.alpha).toBe(1);
    expect(pending.size).toBe(0);
  });

  it('throwing frame callbacks warn once but still settle and stay idle', async () => {
    const { renderer, draw, pending, step } = setup();
    const warn = rstest.spyOn(console, 'warn').mockImplementation(() => {});
    await draw(); renderer.startTransition();
    await draw(data(3)); renderer.startTransition();
    renderer.onTransitionFrame = () => { throw new Error('host callback'); };
    step(); step(); step(750);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(renderer.getTransitionFrame()).toBeNull();
    expect(pending.size).toBe(0);
  });

  it('promote toggles retain the moving Pixi position, and entering cards grow/fade to final', async () => {
    const { renderer, draw, step } = setup();
    await draw(); renderer.startTransition();
    const expanded = data(3);
    expanded.positions.push({ ...data(5).positions[0], id: 'b' });
    await draw(expanded); renderer.startTransition();
    const [moving, entering] = renderer.layers.persons.children;
    expect(entering.scale.x).toBe(0.9);
    expect(entering.alpha).toBe(0);
    renderer.setPromotedNodeIds(['a']);
    expect(moving.visible).toBe(false);
    const before = moving.x; step();
    expect(moving.x).toBeGreaterThan(before);
    renderer.setPromotedNodeIds([]);
    expect(moving.visible).toBe(true);
    renderer.settleNow(); renderer.settleNow();
    expect(entering.scale.x).toBe(1);
    expect(entering.alpha).toBe(1);
  });

  it('destroy cancels pending work and remains idempotent', async () => {
    const { renderer, draw, pending } = setup();
    await draw(); renderer.startTransition();
    await draw(data(2)); renderer.startTransition();
    renderer.destroy(); renderer.destroy();
    expect(pending.size).toBe(0);
  });
});


it('demoting an exiting promoted card reveals its fading Pixi ghost', async () => {
  const { renderer, draw, step } = setup();
  await draw(); renderer.startTransition();
  const old = renderer.layers.persons.children[0];
  renderer.setPromotedNodeIds(['a']);
  await draw({ ...data(), positions: [] }); renderer.startTransition();
  renderer.setPromotedNodeIds([]);
  expect(old.visible).toBe(true);
  step(50);
  expect(old.alpha).toBeGreaterThan(0);
  expect(old.alpha).toBeLessThan(1);
});

it('abort restores the displayed React chrome as well as displayed card coordinates', async () => {
  const { renderer, step } = setup();
  const config = { ...defaultRenderConfig, staffReactChrome: true };
  const draw = (input: DiagramData) => renderer.render(input, defaultNodeTheme, 'light', config, {
    transition: 'animate', staff: { currentOrgId: 'org' },
  });
  await draw(staff(0)); renderer.startTransition();
  await draw(staff(3)); renderer.startTransition(); step();
  const displayed = renderer.getStaffChromeGeometry();
  const refused = staff(5);
  Object.defineProperty(refused.positions[0], 'gridCell', { get() { throw new Error('refused layout'); } });
  await expect(draw(refused)).rejects.toThrow('refused layout');
  renderer.abortTransition();
  expect(renderer.getStaffChromeGeometry()).toEqual(displayed);
});


// The same independent mock3 input used to capture the existing Rust DG golden.
function alphaData(): DiagramData {
  const rows = [
    ['ceo', '', ''], ['asst', 'ceo', ''], ['cfo', 'ceo', 'fin'],
    ['acc', 'cfo', 'fin'], ['fan', 'cfo', 'fin'], ['bk', 'acc', 'fin'],
    ['bz', 'acc', 'fin'], ['bp', 'acc', 'fin'], ['trs', 'cfo', 'fin'],
    ['csh', 'trs', 'fin'], ['pay', 'trs', 'fin'], ['fa2', 'fan', 'fin'],
    ['fa3', 'fan', 'fin'], ['eco', 'cfo', 'fin'], ['pln', 'eco', 'fin'],
    ['ctl', 'cfo', 'fin'], ['aud', 'acc', ''], ['cco', 'ceo', 'sal'],
    ['s1', 'cco', 'sal'], ['s2', 'cco', 'sal'], ['cto', 'ceo', 'dev'],
    ['tlb', 'cto', 'dev'], ['tlf', 'cto', 'dev'], ['d1', 'tlb', 'dev'],
    ['d2', 'tlb', 'dev'], ['ah', 'cfo', 'ana'], ['da', 'ah', 'ana'],
    ['bi', 'cto', 'ana'], ['qh', 'tlb', 'qa'], ['q1', 'qh', 'qa'],
    ['q2', 'qh', 'qa'], ['hrd', 'ceo', 'hr'], ['rec', 'hrd', 'hr'],
    ['trn', 'hrd', 'hr'], ['hrb', 'hrd', 'hr'], ['rc2', 'rec', 'hr'],
    ['lgl', 'ceo', 'leg'], ['lw1', 'lgl', 'leg'], ['lw2', 'lgl', 'leg'],
    ['cmo', 'cco', 'mkt'], ['smm', 'cmo', 'mkt'], ['brd', 'cmo', 'mkt'],
    ['mka', 'cmo', 'mkt'], ['lgh', 'cco', 'lgs'], ['wh', 'lgh', 'lgs'],
    ['dsp', 'lgh', 'lgs'], ['wk', 'wh', 'lgs'], ['sch', 'ceo', 'sec'],
    ['ib', 'cto', 'sec'], ['grd', 'sch', 'sec'],
  ];
  return {
    ...staff(),
    positions: rows.map(([id, , dept]) => ({
      id, title: id, organizationId: 'org', departmentId: dept || undefined,
      groupIds: [], status: 'vacant', isTemporary: false, isHead: id === 'ceo',
    })),
    departments: ['fin', 'sal', 'dev', 'ana', 'qa', 'hr', 'leg', 'mkt', 'lgs', 'sec']
      .map((id, order) => ({ id, name: id, organizationId: 'org', order })),
    reportLines: [...rows.filter(([, parent]) => parent).map(([id, parent]) => ({
      fromId: parent, toId: id, kind: 'admin' as const,
    })), { fromId: 'ceo', toId: 'da', kind: 'admin' }],
  };
}

it('opt-out and settled alpha cards/routes match the existing DG mockup golden', async () => {
  const { renderer, pending, step } = setup();
  const input = alphaData();
  const expanded = input.positions.map((position) => position.id);
  const config = { ...defaultRenderConfig, staffAlphaMockup: true, staffReactChrome: true };
  const draw = (ids: string[]) => renderer.render(input, defaultNodeTheme, 'light', config, {
    transition: 'animate', staff: { currentOrgId: 'org', layout: { expandedPositionIds: ids } },
  });
  // Typed fixture boundary: this committed file is the independent Rust golden,
  // never generated or updated by this test.
  const golden = JSON.parse(readFileSync('../core/tests/fixtures/mockup-golden-mock3-dg.json', 'utf8')) as {
    nodes: { id: string; x: number; y: number; width: number; height: number }[];
    frames: { departmentId: string; x: number; y: number; width: number; height: number }[];
    edges: { fromId: string; toId: string; points: { x: number; y: number }[]; endsOnDeptTop: boolean }[];
  };
  renderer.configureTransition(null);
  await draw(expanded);
  const boxes = renderer.listNodeBoxes().map(({ id, x, y, width, height }) => ({
    id: id.slice('position:'.length), x, y, width, height,
  })).sort((a, b) => a.id.localeCompare(b.id));
  expect(boxes).toEqual(golden.nodes);
  expect(pending.size).toBe(0);
  const fullChrome = renderer.getStaffChromeGeometry();
  expect(fullChrome?.lines).toEqual(golden.edges.map(({ fromId, toId, points, endsOnDeptTop }) => ({
    fromId, toId, points, endsOnDeptTop,
  })));
  renderer.configureTransition(resolveAnimate(true, false));
  await draw(expanded); renderer.startTransition();
  await draw(['ceo']); renderer.startTransition();
  const exiting = [...(renderer.getTransitionFrame()?.values() ?? [])].filter((box) => box.phase === 'exiting');
  expect(exiting.length).toBeGreaterThan(3);
  const lastFrames = renderer.getStaffChromeGeometry()?.depts;
  step();
  expect(renderer.getStaffChromeGeometry()?.lines).toEqual([]);
  expect(lastFrames).toBeDefined();
  await draw(expanded); renderer.startTransition();
  renderer.settleNow();
  expect(renderer.getStaffChromeGeometry()).toEqual(fullChrome);
  expect(renderer.layers.persons.children).toHaveLength(golden.nodes.length);
  expect(pending.size).toBe(0);
});

it('continuous retargets obey the 750ms burst cap and scenes over 2000 keys snap', async () => {
  const { renderer, draw, step, pending } = setup();
  await draw(); renderer.startTransition();
  await draw(data(2)); renderer.startTransition();
  for (let i = 0; i < 7; i++) {
    step(100);
    await draw(data(i + 3)); renderer.startTransition();
  }
  step(50);
  expect(renderer.getTransitionFrame()).toBeNull();
  expect(renderer.layers.edges.alpha).toBe(1);
  expect(pending.size).toBe(0);
  const many = { ...data(), positions: Array.from({ length: 2001 }, (_, i) => ({
    ...data().positions[0], id: String(i), gridCell: { col: i, row: 0 },
  })) };
  await draw(many); renderer.startTransition();
  expect(renderer.getTransitionFrame()).toBeNull();
  expect(pending.size).toBe(0);
});

it('natural settle fades new Pixi lines in, signals settle once, and settleNow finishes a pending line fade', async () => {
  const { renderer, step, pending } = setup();
  const draw = (col: number) => renderer.render(staff(col), defaultNodeTheme, 'light', defaultRenderConfig, {
    transition: 'animate', staff: { currentOrgId: 'org' },
  });
  await draw(0); renderer.startTransition();
  await draw(3); renderer.startTransition();
  const settled = rstest.fn();
  renderer.onTransitionFrame = () => { if (!renderer.getTransitionFrame()) settled(); };
  step(750);
  expect(settled).toHaveBeenCalledTimes(1);
  expect(renderer.getTransitionFrame()).toBeNull();
  expect(renderer.layers.edges.alpha).toBeGreaterThan(0);
  expect(renderer.layers.edges.alpha).toBeLessThan(1);
  step(50);
  expect(renderer.layers.edges.alpha).toBeLessThan(1);
  renderer.settleNow();
  expect(renderer.layers.edges.alpha).toBe(1);
  expect(pending.size).toBe(0);
  expect(settled).toHaveBeenCalledTimes(1);
  await draw(5); renderer.startTransition(); step(750); step(200);
  expect(renderer.layers.edges.alpha).toBe(1);
  expect(pending.size).toBe(0);
});
