import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram, type OrgHierarchyConfig } from './OrgHierarchyDiagram.js';
import { emptyDiagramData } from './data/types.js';
import type { WheelBehavior, WheelConfig } from './index.js';
import { PixiHost } from './render/PixiHost.js';

const diagrams: OrgHierarchyDiagram[] = [];
const mediaTemplate = window.matchMedia('screen');
beforeEach(() => {
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...mediaTemplate, matches: false });
});
afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
  rstest.restoreAllMocks();
});

async function mount(wheel?: WheelConfig) {
  const config = {
    data: emptyDiagramData(), theme: 'light', useWorker: false, motionBlur: false,
    ...(wheel ? { wheel } : {}),
  } satisfies OrgHierarchyConfig;
  const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), config);
  diagrams.push(diagram);
  diagram.setViewport({ x: 0, y: 0, scale: 1 });
  const canvas = diagram.getCanvas();
  if (!canvas) throw new Error('Expected a mounted canvas');
  return { diagram, canvas };
}

describe('facade wheel configuration', () => {
  it('leaves omitted wheel config undefined and preserves Viewport defaults', async () => {
    const create = rstest.spyOn(PixiHost, 'create');
    const { diagram, canvas } = await mount();
    expect(create.mock.calls[0]?.[1]?.wheel).toBeUndefined();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, cancelable: true }));
    expect(diagram.getViewport()).toEqual({ x: 0, y: -40, scale: 1 });
    const shift = new WheelEvent('wheel', {
      deltaY: 40, shiftKey: true, cancelable: true,
    });
    canvas.dispatchEvent(shift);
    expect(shift.defaultPrevented).toBe(false);
    expect(diagram.getViewport()).toEqual({ x: 0, y: -40, scale: 1 });
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -100, ctrlKey: true, cancelable: true,
    }));
    expect(diagram.getZoom()).toBeGreaterThan(1);
  });

  it('honors pan-only configuration instead of falling back to modifier zoom', async () => {
    const { diagram, canvas } = await mount({ behavior: 'pan' });
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 40, ctrlKey: true, cancelable: true,
    }));
    expect(diagram.getViewport()).toEqual({ x: 0, y: -40, scale: 1 });
  });

  it('forwards public wheel config through PixiHost to the mounted Viewport', async () => {
    const create = rstest.spyOn(PixiHost, 'create');
    const behavior: WheelBehavior = 'zoom';
    const wheel: WheelConfig = { behavior, gestures: { panHorizontal: 'shift' } };
    const { diagram, canvas } = await mount(wheel);
    expect(create.mock.calls[0]?.[1]?.wheel).toBe(wheel);
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
    expect(diagram.getZoom()).toBeGreaterThan(1);
    diagram.setViewport({ x: 0, y: 0, scale: 1 });
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 40, shiftKey: true, cancelable: true,
    }));
    expect(diagram.getViewport()).toEqual({ x: -40, y: 0, scale: 1 });
  });
});
