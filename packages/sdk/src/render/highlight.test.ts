import { describe, expect, it, rstest } from '@rstest/core';
import { Container, Graphics } from 'pixi.js';
import { OrgHierarchyDiagram } from '../OrgHierarchyDiagram.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { StaffEdgesView } from './StaffEdgesView.js';
import { OrgEdgesView } from './OrgEdgesView.js';
import { defaultNodeTheme } from './types.js';

const segment = { x1: 0, y1: 0, x2: 0, y2: 100, fromId: 'a', toId: 'b', kind: 'admin' as const, points: [{ x: 0, y: 0 }, { x: 0, y: 100 }] };

describe('edge highlight paint', () => {
  for (const router of ['legacy', 'v2'] as const) {
    it(`success: ${router} cache accents and restores without layout`, () => {
      const view = StaffEdgesView.fromLayout(
        [{ fromId: 'a', toId: 'b', kind: 'admin' }],
        [{ id: 'a', x: 0, y: 0, width: 100, height: 50 }, { id: 'b', x: 0, y: 150, width: 100, height: 50 }],
        { edge: { accentColor: 0x00ff00, accentWidth: 3, dimAlpha: 0.2 } },
        router === 'v2' ? { segments: [segment] } : undefined,
      );
      const stroke = rstest.spyOn(Graphics.prototype, 'stroke');
      view.applyHighlight({ accentKeys: new Set(['a\u0000b']), dim: true });
      expect(stroke).toHaveBeenCalledWith(expect.objectContaining({ color: 0x00ff00, width: 3, alpha: 1 }));
      stroke.mockClear();
      view.applyHighlight({ accentKeys: new Set(), dim: true });
      expect(stroke).toHaveBeenCalledWith(expect.objectContaining({ alpha: 0.2 }));
      stroke.mockClear();
      view.applyHighlight({ accentKeys: new Set(), dim: false });
      expect(stroke).toHaveBeenCalledWith(expect.objectContaining({ color: 0x334155, alpha: 1 }));
      stroke.mockRestore();
      view.destroy({ children: true });
    });
  }
  it('success: org edges dim uniformly and restore', () => {
    const view = OrgEdgesView.fromEdges([], { dimAlpha: 0.2 });
    view.applyHighlight({ accentKeys: new Set(['a\u0000b']), dim: true });
    expect(view.alpha).toBe(0.2);
    view.applyHighlight({ accentKeys: new Set(), dim: false });
    expect(view.alpha).toBe(1);
    view.destroy({ children: true });
  });
});

describe('highlight facade', () => {
  it('success: defers before render and keeps raw path and typed found state', () => {
    const diagram = new OrgHierarchyDiagram();
    diagram.highlightPath('a');
    diagram.setFoundFocus(['a', 'person:b']);
    expect(diagram['viewState'].highlightedNode).toBe('a');
    expect(diagram['viewState'].foundFocus).toEqual(new Set(['position:a', 'organization:a', 'person:a', 'person:b']));
    diagram.setFoundFocus([]);
    diagram.highlightPath(null);
    expect(diagram['viewState'].foundFocus).toBeNull();
    expect(diagram['viewState'].highlightedNode).toBeNull();
    diagram.destroy();
  });
  it('success: node focus resets to captured external baseline, including no-match', async () => {
    const renderer = new DiagramRenderer();
    const data = { organizations: [], persons: [], positions: [], departments: [], groups: [], reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' as const }] };
    await renderer.render(data, defaultNodeTheme, 'light');
    const external = new Container();
    external.alpha = 0.55;
    const found = new Container();
    renderer['scene'].registerView('position', 'a', found);
    renderer['scene'].registerView('person', 'b', external);
    const edges = StaffEdgesView.fromLayout([], [], {}, { segments: [segment] });
    renderer.layers.edges.addChild(edges);
    const paint = rstest.spyOn(edges, 'applyHighlight');
    renderer.repaintHighlight('b', null, data.reportLines, defaultNodeTheme);
    expect(paint).toHaveBeenLastCalledWith({ accentKeys: new Set(['a\u0000b']), dim: true });
    expect(external.alpha).toBe(0.55);
    for (const reset of [null, new Set<string>(), new Set(['person:missing'])]) {
      renderer.repaintHighlight(null, new Set(['position:a']), data.reportLines, { ...defaultNodeTheme, foundDimAlpha: 0.31 });
      expect(found.alpha).toBe(1);
      expect(external.alpha).toBe(0.31);
      renderer.repaintHighlight(null, reset, data.reportLines, defaultNodeTheme);
      expect(external.alpha).toBe(0.55);
      expect(found.alpha).toBe(1);
    }
    renderer.repaintHighlight(null, new Set(['person:b']), [], defaultNodeTheme);
    expect(external.alpha).toBe(0.55);
    expect(found.alpha).toBe(0.38);
    renderer.destroy();
  });
});

it('success: facade reapplies after rebuild, clears on setData, and selection does not repaint highlight', async () => {
  const data = {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false },
      { id: 'child', name: 'Child', parentOrgId: 'root', groupIds: [] },
    ],
    persons: [], positions: [], departments: [], groups: [], reportLines: [],
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, { data, useWorker: false, theme: 'light' });
  const renderer = diagram['renderer'];
  if (!renderer) throw new Error('Expected mounted renderer');
  const paint = rstest.spyOn(renderer, 'repaintHighlight');
  diagram.setFoundFocus('organization:root');
  expect(renderer['scene'].getView('organization', 'child')?.alpha).toBe(0.38);
  paint.mockClear();
  await diagram.select({ kind: 'organization', id: 'root' });
  expect(paint).not.toHaveBeenCalled();
  await diagram.setTheme('dark');
  expect(renderer['scene'].getView('organization', 'child')?.alpha).toBe(0.38);
  diagram.highlightPath('root');
  await diagram.setData(data);
  expect(diagram['viewState'].highlightedNode).toBeNull();
  expect(diagram['viewState'].foundFocus).toBeNull();
  expect(renderer['scene'].getView('organization', 'child')?.alpha).toBe(1);
  for (const reset of [[], null, ['missing']]) {
    diagram.setFoundFocus('root');
    expect(renderer['scene'].getView('organization', 'child')?.alpha).toBe(0.38);
    diagram.setFoundFocus(reset);
    expect(renderer['scene'].getView('organization', 'child')?.alpha).toBe(1);
  }
  diagram.destroy();
  container.remove();
});

it('failure: no paint before a successful render or after a failed render', async () => {
  const renderer = new DiagramRenderer();
  const view = new Container();
  renderer['scene'].registerView('person', 'p', view);
  renderer['scene'].registerView('person', 'other', new Container());
  renderer.repaintHighlight(null, new Set(['person:other']), [], defaultNodeTheme);
  expect(view.alpha).toBe(1);
  const data = { organizations: [{ id: 'root', name: 'Root', groupIds: [] }], persons: [], positions: [], departments: [], groups: [], reportLines: [] };
  await renderer.render(data, defaultNodeTheme, 'light');
  const build = renderer['renderOrganizations'];
  renderer['renderOrganizations'] = async () => {
    renderer['scene'].registerView('person', 'p', view);
    renderer['scene'].registerView('person', 'other', new Container());
    throw new Error('render failed');
  };
  await expect(renderer.render(data, defaultNodeTheme, 'light')).rejects.toThrow('render failed');
  renderer.repaintHighlight(null, new Set(['person:other']), [], defaultNodeTheme);
  expect(view.alpha).toBe(1);
  renderer['renderOrganizations'] = build;
  renderer.destroy();
});

it('success: a facade request during render is deferred and applied at renderNow tail', async () => {
  const data = {
    organizations: [{ id: 'r', name: 'Root', groupIds: [], collapsed: false }, { id: 'c', name: 'Child', parentOrgId: 'r', groupIds: [] }],
    persons: [], positions: [], departments: [], groups: [], reportLines: [],
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, { data, useWorker: false });
  const renderer = diagram['renderer'];
  if (!renderer) throw new Error('Expected mounted renderer');
  const build = renderer['renderOrganizations'];
  renderer['renderOrganizations'] = async (...args) => {
    await build.apply(renderer, args);
    const child = renderer['scene'].getView('organization', 'c');
    diagram.setFoundFocus('r');
    expect(diagram['viewState'].foundFocus?.has('organization:r')).toBe(true);
    expect(child?.alpha).toBe(1);
  };
  await diagram.setTheme('light');
  expect(renderer['scene'].getView('organization', 'c')?.alpha).toBe(0.38);
  renderer['renderOrganizations'] = build;
  diagram.destroy();
  container.remove();
});
