import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { Container } from 'pixi.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OrgHierarchyDiagram, type OrgHierarchyConfig } from './OrgHierarchyDiagram.js';
import { emptyDiagramData } from './data/types.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';
import type { NodeView, RetainedNodeView, SimpleNodeView } from './render/nodeViewFactory.js';

const diagrams: OrgHierarchyDiagram[] = [];
const mediaTemplate = window.matchMedia('screen');
beforeEach(() => {
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...mediaTemplate, matches: false });
});
afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
  rstest.restoreAllMocks();
});

async function mount(options: { nodeView?: NodeView } = {}) {
  const config = {
    data: emptyDiagramData(), theme: 'light', useWorker: false, motionBlur: false,
    ...options,
  } satisfies OrgHierarchyConfig;
  const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), config);
  diagrams.push(diagram);
}

describe('nodeView facade configuration', () => {
  it('passes a simple factory unchanged to the renderer', async () => {
    const factory: SimpleNodeView = () => new Container();
    const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
    await mount({ nodeView: factory });
    expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
  });

  it('passes a retained factory unchanged to the renderer', async () => {
    const factory: RetainedNodeView = {
      create: () => ({ root: new Container(), update() {}, destroy() {} }),
    };
    const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
    await mount({ nodeView: factory });
    expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
  });

  it('explicitly selects the unchanged built-in path when nodeView is omitted', async () => {
    const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
    await mount();
    expect(setFactory).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('exports all five node-view types from the public barrel', () => {
    // Type-only exports are erased by the runner; inspect their declaration.
    const barrel = readFileSync(resolve('src/index.ts'), 'utf8');
    const declaration = barrel.match(/export type\s*\{([^}]+)\}\s*from ['"]\.\/render\/nodeViewFactory\.js['"]/);
    const names = declaration?.[1].split(',').map((name) => name.trim()).filter(Boolean);
    expect(names).toEqual(expect.arrayContaining([
      'NodeView', 'NodeViewInput', 'NodeViewContext', 'SimpleNodeView', 'RetainedNodeView',
    ]));
    const facade = readFileSync(resolve('src/OrgHierarchyDiagram.ts'), 'utf8');
    expect(facade).toMatch(/nodeView\?: NodeView;/);
  });
});
