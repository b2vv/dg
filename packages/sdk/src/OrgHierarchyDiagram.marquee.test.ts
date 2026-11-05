import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram, type OrgHierarchyConfig } from './OrgHierarchyDiagram.js';
import { orgNodeRef } from './core/index.js';
import { emptyDiagramData } from './data/types.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';
import type { MarqueeRect } from './index.js';

// Observe the agreed seam while exercising R5-B's real renderer setter.
type MarqueeSink = NonNullable<Parameters<DiagramRenderer['setMarqueeSink']>[0]>;
const realSetSink = DiagramRenderer.prototype.setMarqueeSink;
const mediaTemplate = window.matchMedia('screen');
const originalSink = Object.getOwnPropertyDescriptor(DiagramRenderer.prototype, 'setMarqueeSink');
const setSink = rstest.fn(function (this: DiagramRenderer, value: MarqueeSink | null) {
  realSetSink.call(this, value);
});
const diagrams: OrgHierarchyDiagram[] = [];
beforeEach(() => {
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...mediaTemplate, matches: false });
  setSink.mockClear();
  Object.defineProperty(DiagramRenderer.prototype, 'setMarqueeSink', {
    configurable: true, writable: true, value: setSink,
  });
});
afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
  rstest.restoreAllMocks();
  if (originalSink) Object.defineProperty(DiagramRenderer.prototype, 'setMarqueeSink', originalSink);
  else Reflect.deleteProperty(DiagramRenderer.prototype, 'setMarqueeSink');
});
async function mount(onMarquee?: (rect: MarqueeRect | null) => void, onSelectionChange = rstest.fn()) {
  const config = {
    data: { ...emptyDiagramData(), organizations: ['A', 'B', 'C'].map((id) => ({ id, name: id, groupIds: [] })) }, theme: 'light', useWorker: false, motionBlur: false,
    onMarquee, callbacks: { onSelectionChange },
  } satisfies OrgHierarchyConfig;
  const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), config);
  diagrams.push(diagram);
  return diagram;
}
function sink(): MarqueeSink {
  const current = setSink.mock.calls.at(-1)?.[0];
  if (!current) throw new Error('Expected an installed marquee sink');
  return current;
}

describe('facade marquee', () => {
  it('success: absent onMarquee never installs or clears a sink', async () => {
    const diagram = await mount();
    expect(setSink).not.toHaveBeenCalled();
    diagram.destroy();
    expect(setSink).not.toHaveBeenCalled();
  });

  it('failure: destroy clears the installed sink and retained callbacks become inert', async () => {
    const onMarquee = rstest.fn();
    const diagram = await mount(onMarquee);
    const installed = sink();
    diagram.destroy();
    expect(setSink).toHaveBeenLastCalledWith(null);
    expect(setSink).toHaveBeenCalledTimes(2);
    installed.onRect({ x: 1, y: 2, width: 3, height: 4 });
    installed.onSelect(['organization:B']);
    expect(onMarquee).not.toHaveBeenCalled();
    expect(diagram.getSelections()).toEqual([]);
    diagram.destroy();
    expect(setSink).toHaveBeenCalledTimes(2);
  });

  it('failure: a throwing host warns once while later frames and selection continue', async () => {
    const warn = rstest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = rstest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('host marquee failed');
    const onMarquee = rstest.fn(() => { throw failure; });
    const diagram = await mount(onMarquee);
    const rect = { x: 1, y: 2, width: 3, height: 4 };
    expect(() => sink().onRect(rect)).not.toThrow();
    expect(() => sink().onRect({ ...rect, width: 5 })).not.toThrow();
    expect(() => sink().onRect(null)).not.toThrow();
    sink().onSelect(['organization:B']);
    expect(diagram.getSelections()).toEqual([orgNodeRef('B')]);
    expect(onMarquee).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('OrgHierarchyDiagram: onMarquee threw', failure);
    expect(error).not.toHaveBeenCalled();
  });

  it('success: marquee unions with live selection in order, deduplicates and preserves empty hits', async () => {
    const selected = rstest.fn();
    const diagram = await mount(rstest.fn(), selected);
    await diagram.select(orgNodeRef('A'));
    const repaint = rstest.spyOn(DiagramRenderer.prototype, 'repaintSelection');
    sink().onSelect(['organization:B', 'organization:C', 'organization:B', 'organization:A']);
    expect(diagram.getSelections()).toEqual([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
    expect(selected).toHaveBeenLastCalledWith([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
    expect(repaint).toHaveBeenCalledWith([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
    sink().onSelect([]);
    expect(diagram.getSelections()).toEqual([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
    await diagram.select(orgNodeRef('C'));
    sink().onSelect(['organization:B']);
    expect(diagram.getSelections()).toEqual([orgNodeRef('C'), orgNodeRef('B')]);
  });

  it('success: opt-in installs a sink and forwards each world rectangle and null', async () => {
    const onMarquee = rstest.fn();
    await mount(onMarquee);
    expect(setSink).toHaveBeenCalledTimes(1);
    const rect = { x: -20, y: 30, width: 80, height: 90 };
    sink().onRect(rect);
    sink().onRect({ ...rect, width: 100 });
    sink().onRect(null);
    expect(onMarquee.mock.calls).toEqual([[rect], [{ ...rect, width: 100 }], [null]]);
  });
});
