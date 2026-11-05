import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from './OrgHierarchyDiagram.js';
import { EventBoundary, FederatedPointerEvent } from 'pixi.js';
import { PersonNodeView } from './render/PersonNode.js';
import { emptyDiagramData, type DiagramData } from './data/types.js';
import { orgNodeRef } from './core/index.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';
import { InteractionStore } from './state/InteractionStore.js';
import { PixiHost } from './render/PixiHost.js';

const mediaTemplate = window.matchMedia('screen');
const setSource = DiagramRenderer.prototype.setInteractionSource;
const source = rstest.fn(function (this: DiagramRenderer, interaction: Parameters<typeof setSource>[0]) {
  setSource.call(this, interaction);
});
const originalSource = Object.getOwnPropertyDescriptor(DiagramRenderer.prototype, 'setInteractionSource');
beforeEach(() => {
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...mediaTemplate, matches: false });
  source.mockClear();
  Object.defineProperty(DiagramRenderer.prototype, 'setInteractionSource', {
    configurable: true, writable: true, value: source,
  });
});
const diagrams: OrgHierarchyDiagram[] = [];
afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
  rstest.restoreAllMocks();
  if (originalSource) Object.defineProperty(DiagramRenderer.prototype, 'setInteractionSource', originalSource);
  else Reflect.deleteProperty(DiagramRenderer.prototype, 'setInteractionSource');
});
const a = orgNodeRef('a');
const b = orgNodeRef('b');
const data = () => ({ ...emptyDiagramData(), organizations: [{ id: 'a', name: 'A', groupIds: [] }] });
async function mount(onSelectionChange = rstest.fn(), initialData: DiagramData = data()) {
  const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), {
    data: initialData, theme: 'light', useWorker: false, motionBlur: false,
    callbacks: { onSelectionChange },
  });
  diagrams.push(diagram);
  return diagram;
}


function staffData(): DiagramData {
  return {
    ...emptyDiagramData(),
    positions: ['a', 'b', 'c'].map((id, col) => ({
      id, title: id, organizationId: 'o', groupIds: [], status: 'vacant',
      isTemporary: false, gridCell: { col, row: 0 },
    })),
    reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
  };
}

function staffRenderer(diagram: OrgHierarchyDiagram) {
  return (diagram as unknown as { host: PixiHost }).host.renderer;
}

function hoverFirstSeat(renderer: DiagramRenderer) {
  const seat = renderer.layers.persons.children[0];
  if (!(seat instanceof PersonNodeView)) throw new Error('Expected a staff seat');
  seat.emit('pointerover', new FederatedPointerEvent(new EventBoundary(seat)));
}

function paintInteraction(renderer: DiagramRenderer) {
  renderer.cullToViewport({ x: 0, y: 0, scale: 1 }, { width: 800, height: 600 });
}

describe('facade interaction state', () => {
  it('success: an untouched staff host keeps local hover and selection callbacks', async () => {
    const selected = rstest.fn();
    const diagram = await mount(selected, staffData());
    const renderer = staffRenderer(diagram);
    expect(renderer.layers.persons.children).toHaveLength(3);
    expect(source).not.toHaveBeenCalled();
    const paint = rstest.spyOn(PixiHost.prototype, 'requestPaint');
    hoverFirstSeat(renderer);
    expect(paint).not.toHaveBeenCalled();
    paintInteraction(renderer);
    expect(renderer.layers.persons.children.map((view) => view.alpha)).toEqual([1, 1, 1]);
    await diagram.select({ kind: 'position', id: 'a' });
    expect(diagram.getSelections()).toEqual([{ kind: 'position', id: 'a' }]);
    expect(selected.mock.calls).toEqual([[[{ kind: 'position', id: 'a' }]]]);
    expect(source).not.toHaveBeenCalled();
  });

  it('success: selection parity and additive state subscription with unsubscribe', async () => {
    const selected = rstest.fn();
    const diagram = await mount(selected);
    const changed = rstest.fn();
    const unsubscribe = diagram.subscribeInteraction(changed);
    await diagram.select(a);
    await diagram.select({ ...a });
    await diagram.toggleSelection(b);
    await diagram.selectMany([b, a, b]);
    expect(selected.mock.calls).toEqual([[[a]], [[a, b]], [[b, a]]]);
    expect(diagram.getSelection()).toEqual(b);
    expect(diagram.getSelections()).toEqual([b, a]);
    diagram.setHovered(a);
    expect(changed.mock.calls.at(-1)).toEqual([{ selected: [b, a], primary: b, hovered: a }]);
    expect(changed).toHaveBeenCalledTimes(4);
    expect(selected).toHaveBeenCalledTimes(3);
    unsubscribe();
    unsubscribe();
    diagram.setHovered(null);
    await diagram.clearSelection();
    expect(changed).toHaveBeenCalledTimes(4);
    expect(selected.mock.calls.at(-1)).toEqual([[]]);
  });

  it('failure: a throwing subscriber cannot prevent selection or later subscribers', async () => {
    const selected = rstest.fn();
    const diagram = await mount(selected);
    rstest.spyOn(console, 'warn').mockImplementation(() => {});
    diagram.subscribeInteraction(() => { throw new Error('host failed'); });
    const healthy = rstest.fn();
    diagram.subscribeInteraction(healthy);
    await diagram.select(a);
    expect(selected).toHaveBeenCalledWith([a]);
    expect(healthy).toHaveBeenCalledWith({ selected: [a], primary: a, hovered: null });
  });

  it('success: unchanged data retains hover; disappearance clears stale hover', async () => {
    const diagram = await mount();
    const changed = rstest.fn();
    diagram.subscribeInteraction(changed);
    diagram.setHovered(a);
    await diagram.setData(data());
    expect(changed).toHaveBeenCalledTimes(1);
    await diagram.setData(emptyDiagramData());
    expect(changed.mock.calls.at(-1)).toEqual([{ selected: [], primary: null, hovered: null }]);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('failure: an unknown ref is accepted then reconciled by kind, not bare id', async () => {
    const diagram = await mount();
    const changed = rstest.fn();
    diagram.subscribeInteraction(changed);
    diagram.setHovered({ kind: 'position', id: 'a' });
    await diagram.setData(data());
    expect(changed.mock.calls.at(-1)).toEqual([{ selected: [], primary: null, hovered: null }]);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('success: subscriptions opt in once and mounted Pixi hover drives state and paint', async () => {
    const diagram = await mount(rstest.fn(), staffData());
    const renderer = staffRenderer(diagram);
    expect(source).not.toHaveBeenCalled();
    const changed = rstest.fn();
    const unsubscribe = diagram.subscribeInteraction(changed);
    const unsubscribeSecond = diagram.subscribeInteraction(rstest.fn());
    expect(source).toHaveBeenCalledTimes(1);
    const paint = rstest.spyOn(PixiHost.prototype, 'requestPaint');
    const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
    hoverFirstSeat(renderer);
    expect(changed).toHaveBeenCalledWith({
      selected: [], primary: null, hovered: { kind: 'position', id: 'a' },
    });
    expect(paint).toHaveBeenCalledTimes(1);
    paintInteraction(renderer);
    expect(renderer.layers.persons.children.map((view) => view.alpha)).toEqual([1, 1, 0.45]);
    expect(render).not.toHaveBeenCalled();
    diagram.setHovered(null);
    expect(source).toHaveBeenCalledTimes(1);
    unsubscribe();
    unsubscribeSecond();
  });

  it('failure: destroy disposes hover paint and cannot rewire or schedule another frame', async () => {
    const diagram = await mount();
    const subscribe = InteractionStore.prototype.subscribe;
    const disposals: ReturnType<typeof rstest.fn>[] = [];
    rstest.spyOn(InteractionStore.prototype, 'subscribe').mockImplementation(function (this: InteractionStore, callback) {
      const dispose = rstest.fn(subscribe.call(this, callback));
      disposals.push(dispose);
      return dispose;
    });
    diagram.setHovered(a);
    expect(disposals).toHaveLength(1);
    const interaction = source.mock.calls[0]?.[0];
    expect(() => diagram.destroy()).not.toThrow();
    expect(disposals[0]).toHaveBeenCalledTimes(1);
    const paint = rstest.spyOn(PixiHost.prototype, 'requestPaint');
    const request = rstest.spyOn(globalThis, 'requestAnimationFrame');
    interaction?.setHovered(b);
    diagram.setHovered(null);
    const unsubscribe = diagram.subscribeInteraction(rstest.fn());
    unsubscribe();
    expect(() => diagram.destroy()).not.toThrow();
    expect(disposals[0]).toHaveBeenCalledTimes(1);
    expect(source).toHaveBeenCalledTimes(1);
    expect(paint).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('success: renderer shares hover and repaints changes without rebuilding the scene', async () => {
    const diagram = await mount();
    expect(source).not.toHaveBeenCalled();
    const paint = rstest.spyOn(PixiHost.prototype, 'requestPaint');
    const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
    diagram.setHovered(a);
    const interaction = source.mock.calls[0]?.[0];
    expect(source).toHaveBeenCalledTimes(1);
    expect(interaction?.getHovered()).toEqual(a);
    expect(paint).toHaveBeenCalled();
    paint.mockClear();
    diagram.setHovered({ ...a });
    expect(paint).not.toHaveBeenCalled();
    interaction?.setHovered(b);
    expect(interaction?.getHovered()).toEqual(b);
    expect(render).not.toHaveBeenCalled();
    expect(source).toHaveBeenCalledTimes(1);
  });
});
