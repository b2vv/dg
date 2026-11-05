import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from './OrgHierarchyDiagram.js';
import { emptyDiagramData } from './data/types.js';
import { orgNodeRef, type NodeRef } from './core/index.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';
import { PixiHost } from './render/PixiHost.js';

const mediaTemplate = window.matchMedia('screen');
const source = rstest.fn((_source: { getHovered(): NodeRef | null; setHovered(ref: NodeRef | null): void } | null) => {});
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
async function mount(onSelectionChange = rstest.fn()) {
  const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), {
    data: data(), theme: 'light', useWorker: false, motionBlur: false,
    callbacks: { onSelectionChange },
  });
  diagrams.push(diagram);
  return diagram;
}

describe('facade interaction state', () => {
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

  it('success: renderer shares hover and repaints changes without rebuilding the scene', async () => {
    const diagram = await mount();
    const interaction = source.mock.calls[0]?.[0];
    expect(interaction).toBeTruthy();
    const paint = rstest.spyOn(PixiHost.prototype, 'requestPaint');
    const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
    diagram.setHovered(a);
    expect(interaction?.getHovered()).toEqual(a);
    expect(paint).toHaveBeenCalled();
    paint.mockClear();
    diagram.setHovered({ ...a });
    expect(paint).not.toHaveBeenCalled();
    interaction?.setHovered(b);
    expect(interaction?.getHovered()).toEqual(b);
    expect(render).not.toHaveBeenCalled();
  });
});
