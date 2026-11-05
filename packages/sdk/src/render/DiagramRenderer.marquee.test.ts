import { afterEach, expect, it, rstest } from '@rstest/core';
import { Container, EventBoundary, FederatedContainer, FederatedPointerEvent, extensions } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { Viewport } from './Viewport.js';
import { emptyDiagramData } from '../data/types.js';
import { defaultNodeTheme, defaultRenderConfig } from './types.js';

// Standalone containers need the event mixin normally installed by Application.
extensions.mixin(Container, FederatedContainer);

const renderers: DiagramRenderer[] = [];
afterEach(() => { for (const renderer of renderers.splice(0)) renderer.destroy(); });

async function setup(lod: 'near' | 'far' = 'near', enabled = true) {
  const renderer = new DiagramRenderer();
  renderers.push(renderer);
  const stage = new Container();
  stage.eventMode = 'static';
  renderer.mount(stage);
  const viewport = new Viewport(renderer.layers.root);
  // Same stage pan contract as PixiHost.bindPan, with real camera movement.
  stage.on('pointerdown', (e) => { if (e.button === 0 || e.button === 1) viewport.beginPan(e.pointerId, e.global.x, e.global.y); });
  stage.on('globalpointermove', (e) => viewport.movePan(e.pointerId, e.global.x, e.global.y));
  stage.on('pointerup', (e) => viewport.endPan(e.pointerId));
  const sink = { onRect: rstest.fn(), onSelect: rstest.fn() };
  const onCanvasClick = rstest.fn();
  const data = emptyDiagramData();
  data.positions = ['a', 'b'].map((id, col) => ({ id, title: id, organizationId: 'o', groupIds: [], status: 'vacant', isTemporary: false, gridCell: { col, row: 0 } }));
  await renderer.render(data, defaultNodeTheme, 'light', defaultRenderConfig, { lod, onCanvasClick });
  if (enabled) renderer.setMarqueeSink(sink);
  const boundary = new EventBoundary(stage);
  function pointer(type: string, x: number, y: number, shiftKey = true, target = stage) {
    const e = new FederatedPointerEvent(boundary);
    e.type = type;
    e.target = target;
    e.global.set(x, y);
    e.pointerId = 1;
    e.button = 0;
    e.shiftKey = shiftKey;
    if (type === 'globalpointermove') stage.emit(type, e);
    else boundary.dispatchEvent(e, type);
    return e;
  }
  return { renderer, viewport, sink, onCanvasClick, pointer };
}

it('success: Shift drag emits normalized world rectangles, intersects seats and blocks pan', async () => {
  const { renderer, viewport, sink, pointer } = await setup();
  viewport.setTransform({ x: 100, y: 50, scale: 2 });
  const box = renderer.listNodeBoxes()[0];
  if (!box) throw new Error('Expected a seat world box');
  const x = 100 + box.x * 2;
  const y = 50 + box.y * 2;
  pointer('pointerdown', x + 20, y + 20);
  pointer('globalpointermove', x - 10, y - 10);
  pointer('globalpointermove', x - 20, y - 20);
  expect(sink.onRect.mock.calls).toEqual([
    [{ x: box.x - 5, y: box.y - 5, width: 15, height: 15 }],
    [{ x: box.x - 10, y: box.y - 10, width: 20, height: 20 }],
  ]);
  pointer('pointerup', x - 20, y - 20);
  expect(sink.onSelect).toHaveBeenCalledWith([box.id]);
  expect(sink.onRect).toHaveBeenLastCalledWith(null);
  expect(viewport.getTransform()).toEqual({ x: 100, y: 50, scale: 2 });
});

for (const enabled of [true, false]) {
  it(`success: ${enabled ? 'plain drag with sink' : 'Shift drag without sink'} still pans`, async () => {
    const { viewport, sink, pointer } = await setup('near', enabled);
    pointer('pointerdown', 10, 20, !enabled);
    pointer('globalpointermove', 40, 60, !enabled);
    pointer('pointerup', 40, 60, !enabled);
    expect(viewport.getTransform()).toEqual({ x: 30, y: 40, scale: 1 });
    expect(sink.onRect).not.toHaveBeenCalled();
    expect(sink.onSelect).not.toHaveBeenCalled();
  });
}

it('failure boundary: below-threshold Shift click emits no marquee and deselects normally', async () => {
  const { renderer, viewport, sink, pointer, onCanvasClick } = await setup();
  viewport.setTransform({ scale: 0.5 });
  pointer('pointerdown', 10, 20, true, renderer.layers.root);
  pointer('globalpointermove', 14, 20);
  pointer('pointerup', 14, 20, true, renderer.layers.root);
  pointer('pointertap', 14, 20, true, renderer.layers.root);
  expect(sink.onSelect).not.toHaveBeenCalled();
  expect(sink.onRect.mock.calls.filter(([rect]) => rect !== null)).toEqual([]);
  expect(onCanvasClick).toHaveBeenCalledTimes(1);
});

it('success: genuine drag suppresses its tap, but the next ordinary click deselects', async () => {
  const { renderer, sink, pointer, onCanvasClick } = await setup();
  pointer('pointerdown', 10, 20, true, renderer.layers.root);
  pointer('globalpointermove', 60, 80);
  pointer('pointerup', 60, 80, true, renderer.layers.root);
  pointer('pointertap', 60, 80, true, renderer.layers.root);
  expect(sink.onSelect).toHaveBeenCalledTimes(1);
  expect(onCanvasClick).not.toHaveBeenCalled();
  pointer('pointerdown', 60, 80, false, renderer.layers.root);
  pointer('pointerup', 60, 80, false, renderer.layers.root);
  pointer('pointertap', 60, 80, false, renderer.layers.root);
  expect(onCanvasClick).toHaveBeenCalledTimes(1);
});

it('success: mid-drag camera changes preserve the original world start', async () => {
  const { viewport, sink, pointer } = await setup();
  viewport.setTransform({ x: 100, y: 50, scale: 2 });
  pointer('pointerdown', 120, 90);
  pointer('globalpointermove', 160, 130);
  viewport.setTransform({ x: -30, y: 10, scale: 0.5 });
  pointer('globalpointermove', 0, 50);
  expect(sink.onRect).toHaveBeenLastCalledWith({ x: 10, y: 20, width: 50, height: 60 });
  pointer('pointerup', 0, 50);
  expect(sink.onRect).toHaveBeenLastCalledWith(null);
});

it('failure boundary: pointercancel clears the rectangle and never selects', async () => {
  const { sink, pointer } = await setup();
  pointer('pointerdown', 10, 20);
  pointer('globalpointermove', 60, 80);
  pointer('pointercancel', 60, 80);
  expect(sink.onRect).toHaveBeenLastCalledWith(null);
  pointer('globalpointermove', 90, 90);
  pointer('pointerup', 90, 90);
  expect(sink.onSelect).not.toHaveBeenCalled();
  expect(sink.onRect).toHaveBeenCalledTimes(2);
});

it('success: far LOD selects from world boxes at a fractional zoom', async () => {
  const { renderer, viewport, sink, pointer } = await setup('far');
  viewport.setTransform({ x: 31, y: -17, scale: 0.5 });
  const box = renderer.listNodeBoxes()[0];
  if (!box) throw new Error('Expected a seat world box');
  const x = 31 + box.x * 0.5;
  const y = -17 + box.y * 0.5;
  pointer('pointerdown', x - 10, y - 10);
  pointer('globalpointermove', x + 5, y + 5);
  pointer('pointerup', x + 5, y + 5);
  expect(sink.onSelect).toHaveBeenCalledWith([box.id]);
});

it('failure boundary: disabling an active marquee clears its old sink and restores pan', async () => {
  const { renderer, viewport, sink, pointer } = await setup();
  pointer('pointerdown', 10, 20);
  pointer('globalpointermove', 60, 80);
  renderer.setMarqueeSink(null);
  expect(sink.onRect).toHaveBeenLastCalledWith(null);
  pointer('pointerup', 60, 80);
  pointer('pointerdown', 60, 80);
  pointer('globalpointermove', 70, 90);
  pointer('pointerup', 70, 90);
  expect(viewport.getTransform()).toEqual({ x: 10, y: 10, scale: 1 });
  expect(sink.onSelect).not.toHaveBeenCalled();
});

it('failure boundary: a node target cannot begin marquee', async () => {
  const { renderer, sink, pointer } = await setup();
  const target = renderer.layers.persons.children[0];
  if (!target) throw new Error('Expected a seat');
  pointer('pointerdown', 10, 20, true, target);
  pointer('globalpointermove', 60, 80);
  pointer('pointerup', 60, 80);
  expect(sink.onRect).not.toHaveBeenCalled();
  expect(sink.onSelect).not.toHaveBeenCalled();
});

it('success: release outside completes once and idle moves do no work', async () => {
  const { sink, pointer } = await setup();
  pointer('pointerdown', 10, 20);
  pointer('globalpointermove', 60, 80);
  pointer('pointerupoutside', 60, 80);
  pointer('globalpointermove', 90, 100);
  pointer('pointerup', 90, 100);
  expect(sink.onSelect).toHaveBeenCalledTimes(1);
  expect(sink.onRect).toHaveBeenCalledTimes(2);
  expect(sink.onRect).toHaveBeenLastCalledWith(null);
});
